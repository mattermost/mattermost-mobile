// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Fetches for the access_control property group. Despite the file name this is no
// longer classification-specific: the group holds the classification system and
// channel fields alongside every other channel attribute, and the requests here
// were already scoped by group rather than by field name.

import {removeStoredFields} from '@actions/local/channel_attributes';
import {channelAttributeWriteLockKey} from '@actions/remote/channel_attributes';
import {ACCESS_CONTROL_GROUP_NAME, CHANNEL_ATTRIBUTE_OBJECT_TYPE, FEATURE_FLAG_CHANNEL_ATTRIBUTES, OWNED_OBJECT_TYPES} from '@constants/channel_attributes';
import {
    CLASSIFICATIONS_FIELD_TARGET_ID,
    CLASSIFICATIONS_FIELD_TARGET_TYPE,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
} from '@constants/classification';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PROPERTY_FIELDS_SEARCH_VERSION} from '@constants/versions';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getAccessControlValuesForTarget, getPropertyFieldsByIds, isAccessControlPropertiesEnabled} from '@queries/servers/properties';
import {getConfigValue} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumServerVersion} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Database} from '@nozbe/watermelondb';

// Only these types resolve a stored value against the field's option list. A text
// attribute stores its display string directly, so treating an unmatched value as
// a stale option would force a field refetch on every text value ever set.
const OPTION_BACKED_TYPES = new Set<PropertyFieldType>(['select', 'multiselect', 'rank']);

export function accessControlWriteLockKey(serverUrl: string): string {
    return `access-control:${serverUrl}`;
}

/**
 * Fetches every field definition in the access_control group, plus the system
 * values that drive the global classification banner.
 *
 * One request covers both features: the group holds the classification system and
 * channel fields and every other channel attribute, and the search is scoped by
 * group rather than by field name. The write is authoritative for the group, so a
 * field deleted server-side disappears locally without a reload.
 */
export async function fetchAccessControlAttributeFields(serverUrl: string, force = false): Promise<{error?: unknown}> {
    if (!force && !EphemeralStore.shouldFetchClassificationBanner(serverUrl)) {
        logDebug('fetchAccessControlAttributeFields', 'skipped; cached data still fresh');
        return {};
    }

    return EphemeralStore.runExclusive(accessControlWriteLockKey(serverUrl), async () => {
        if (!force && !EphemeralStore.shouldFetchClassificationBanner(serverUrl)) {
            return {};
        }

        try {
            const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

            if (await isAccessControlPropertiesEnabled(database)) {
                const client = NetworkManager.getClient(serverUrl);
                const serverVersion = await getConfigValue(database, 'Version');

                let allFields: PropertyField[];
                if (isMinimumServerVersion(serverVersion, ...PROPERTY_FIELDS_SEARCH_VERSION)) {
                    allFields = await client.searchPropertyFields(ACCESS_CONTROL_GROUP_NAME, {
                        object_types: [CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CHANNEL_ATTRIBUTE_OBJECT_TYPE],
                        target_type: CLASSIFICATIONS_FIELD_TARGET_TYPE,
                        target_id: CLASSIFICATIONS_FIELD_TARGET_ID,
                    });
                } else {
                    const [systemFields, channelFields] = await Promise.all([
                        client.getPropertyFields(ACCESS_CONTROL_GROUP_NAME, CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
                        client.getPropertyFields(ACCESS_CONTROL_GROUP_NAME, CHANNEL_ATTRIBUTE_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
                    ]);
                    allFields = [...systemFields, ...channelFields];
                }

                if (allFields.length > 0) {
                    const groupId = allFields[0].group_id;
                    if (!groupId || allFields.some((f) => f.group_id !== groupId)) {
                        logError('fetchAccessControlAttributeFields', 'Unexpected access control fields');

                        // A short backoff, not the 1-hour success TTL: this suppresses
                        // a fetch-and-fail loop from non-forced callers without
                        // hiding a genuine fix (or a forced retry) for an hour, and
                        // existing local data is left untouched.
                        EphemeralStore.setClassificationBannerFailed(serverUrl);
                        return {error: 'access control fields returned an unexpected group_id'};
                    }

                    const values = await client.getSystemPropertyValues<string>(ACCESS_CONTROL_GROUP_NAME);

                    // objectTypes scopes the authoritative prune to what this request
                    // actually fetched: only system+channel object types. Without it,
                    // the group's user/session fields (owned by other features) would
                    // read as "missing from the response" and be deleted.
                    const fieldModels = await operator.handlePropertyFields({groupId, fields: allFields, objectTypes: [...OWNED_OBJECT_TYPES], prepareRecordsOnly: true});
                    const valueModels = await operator.handlePropertyValues({
                        targetId: CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
                        groupId,
                        values,
                        prepareRecordsOnly: true,
                    });

                    // Published for the field observables, which cannot scope
                    // themselves to this group until the id is known. Persisted in the
                    // same batch so field records never exist without a group ID: a
                    // failed write leaves the DB as it was rather than storing
                    // unscopeable rows.
                    const systemIdModels = await operator.handleSystem({
                        systems: [{id: SYSTEM_IDENTIFIERS.ACCESS_CONTROL_GROUP_ID, value: groupId}],
                        prepareRecordsOnly: true,
                    });
                    await operator.batchRecords([...fieldModels, ...valueModels, ...systemIdModels], 'fetchAccessControlAttributeFields', true);

                    EphemeralStore.setClassificationBannerFetched(serverUrl);
                    return {};
                }

                logDebug('fetchAccessControlAttributeFields', 'No access control fields returned');

                await removeStoredFields(serverUrl);
                EphemeralStore.setClassificationBannerFetched(serverUrl);
                return {};
            }

            // Do not stamp the success cache while disabled. A subsequent flag
            // enablement must be able to fetch immediately.
            logDebug('fetchAccessControlAttributeFields', 'Access control features disabled; skipping fetch');
            await removeStoredFields(serverUrl);
            return {};
        } catch (error) {
            logError('fetchAccessControlAttributeFields', 'Failed to fetch access control attribute fields', getFullErrorMessage(error));
            forceLogoutIfNecessary(serverUrl, error);
            return {error};
        }
    });
}

/**
 * Fetches every access_control value on one channel.
 *
 * The endpoint is single-target, so this is one request per channel. It is called
 * from the channel-switch fan-out rather than from a component, because the chips
 * and the Channel Info section need these values on channels that render no
 * banner. Repeat switches are deduped; websocket events keep the values fresh
 * afterwards.
 */
export async function fetchChannelAttributeValues(serverUrl: string, channelId: string, force = false): Promise<{error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Channel attribute values are per-channel and only needed when the
        // channel attributes feature is on. Classification markings uses the
        // system-level values fetched by fetchAccessControlAttributeFields, not
        // per-channel values, so the OR gate would cause a wasted network call
        // on every channel switch when only classification is enabled.
        if ((await getConfigValue(database, FEATURE_FLAG_CHANNEL_ATTRIBUTES)) !== 'true') {
            return {};
        }

        if (!force && EphemeralStore.getChannelAttributeValuesSynced(serverUrl, channelId)) {
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);
        let values: Array<PropertyValue<string>> | undefined;

        // The request itself is serialized with websocket and local writes. Locking
        // only after the response arrives would still let an older REST request
        // commit after a newer websocket update and prune that update as stale.
        await EphemeralStore.runExclusive(channelAttributeWriteLockKey(serverUrl, channelId), async () => {
            // Concurrent non-forced callers can both pass the check above before
            // either enters the queue. Re-check here so only the first one fetches.
            if (!force && EphemeralStore.getChannelAttributeValuesSynced(serverUrl, channelId)) {
                return;
            }

            values = await client.getPropertyValues<string>(ACCESS_CONTROL_GROUP_NAME, CHANNEL_ATTRIBUTE_OBJECT_TYPE, channelId);

            // Upsert without targetId: passing targetId to handlePropertyValues
            // makes the write authoritative by deleting every PropertyValue WHERE
            // target_id=channelId that is not in the list. The table is shared
            // across groups — managed channel categories and future features may
            // store per-channel values in it — so a group-unscoped delete is data
            // loss. Instead, we upsert the returned values and separately prune
            // stale rows that belong to the access_control group.
            const upsertModels = await operator.handlePropertyValues({values, prepareRecordsOnly: true});

            // Prune access_control values the server no longer returns.
            // getAccessControlValuesForTarget returns [] when the group id is not
            // yet known, which is the safe direction for a destructive call.
            const existing = await getAccessControlValuesForTarget(database, channelId);
            const incomingIds = new Set(values.map((v) => v.id));
            const stale = existing.filter((v) => !incomingIds.has(v.id));
            const deleteModels = stale.length ? await operator.handlePropertyValues({
                values: stale.map((v) => ({id: v.id, delete_at: Date.now()} as PropertyValue)),
                prepareRecordsOnly: true,
            }) : [];

            // One propagated batch: a failed write must throw rather than leave the
            // upsert applied and the prune silently skipped (or vice versa), and it
            // must not reach setChannelAttributeValuesSynced below.
            await operator.batchRecords([...upsertModels, ...deleteModels], 'fetchChannelAttributeValues', true);
            EphemeralStore.setChannelAttributeValuesSynced(serverUrl, channelId);
        });

        if (values) {
            await resyncStaleOptions(serverUrl, database, values);
        }

        return {};
    } catch (error) {
        logError('fetchChannelAttributeValues', 'Failed to fetch channel attribute values', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * Forces one field refresh when a value references an option the local field
 * definitions do not know about.
 *
 * The server propagates option changes from a template to its linked fields, so
 * this only covers a missed websocket event or a cache older than the change. The
 * per-option guard is what stops an option that is genuinely gone server-side
 * from causing a refetch loop.
 */
async function resyncStaleOptions(serverUrl: string, database: Database, values: Array<PropertyValue<string>>) {
    // A multiselect value is an array, so both shapes have to be flattened before
    // anything can be compared against a field's option list.
    // Cache key is fieldId:optionId — scoped to the field so a short option ID
    // string (e.g. 'SECRET') on one field cannot collide with the same string
    // used as an option ID on a different field.
    const candidates: Array<{fieldId: string; optionId: string; cacheKey: string}> = [];
    for (const value of values) {
        const raw: unknown = value.value;
        const optionIds = Array.isArray(raw) ? raw : [raw];
        for (const optionId of optionIds) {
            const cacheKey = `${value.field_id}:${optionId}`;
            if (typeof optionId === 'string' && optionId && !EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, cacheKey)) {
                candidates.push({fieldId: value.field_id, optionId, cacheKey});
            }
        }
    }

    if (!candidates.length) {
        return;
    }

    // Looked up by the values' own field ids rather than by group, so this still
    // works before any field fetch has run and taught us the group id — which is
    // exactly the case where the definitions are most likely to be missing.
    const fields = await getPropertyFieldsByIds(database, candidates.map((candidate) => candidate.fieldId));
    const fieldsById = new Map(fields.map((field) => [field.id, field]));

    const stale = candidates.filter(({fieldId, optionId}) => {
        const field = fieldsById.get(fieldId);

        // An unknown field is itself a reason to resync: the value arrived for
        // something the local definitions do not have.
        if (!field) {
            return true;
        }

        if (!OPTION_BACKED_TYPES.has(field.type as PropertyFieldType)) {
            return false;
        }

        const options = field.attrs?.options ?? [];
        return !options.some((option) => option.id === optionId);
    });

    if (!stale.length) {
        return;
    }

    // One refresh answers every stale option in the batch, so all of them are
    // marked. Marking only the first left the rest unguarded while the channel was
    // already deduped, so they were never resolved and never retried.
    const {error} = await fetchAccessControlAttributeFields(serverUrl, true);
    if (!error) {
        for (const {cacheKey} of stale) {
            EphemeralStore.setClassificationFieldSyncAttempted(serverUrl, cacheKey);
        }
    }
}
