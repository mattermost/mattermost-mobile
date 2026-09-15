// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {channelAttributeWriteLockKey} from '@actions/remote/channel_attributes';
import {accessControlWriteLockKey, fetchAccessControlAttributeFields, fetchChannelAttributeValues} from '@actions/remote/classification';
import {OWNED_OBJECT_TYPES} from '@constants/channel_attributes';
import DatabaseManager from '@database/manager';
import {getAccessControlGroupId, getPropertyValuesByFieldId} from '@queries/servers/properties';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import type {PropertyValueModel} from '@database/models/server';
import type ServerDataOperator from '@database/operator/server_data_operator';

export async function handlePropertyFieldCreatedOrUpdated(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {property_field?: string; object_type?: string};
    if (!data.property_field) {
        logDebug('handlePropertyFieldCreatedOrUpdated', 'No property_field in WS event');
        return;
    }

    const field = safeParseJSON(data.property_field) as PropertyField | string;
    if (typeof field === 'string') {
        logDebug('handlePropertyFieldCreatedOrUpdated', 'Failed to parse property_field from WS event');
        return;
    }

    try {
        await EphemeralStore.runExclusive(accessControlWriteLockKey(serverUrl), async () => {
            const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const models = await operator.handlePropertyFields({fields: [field], prepareRecordsOnly: true});
            await operator.batchRecords(models, 'handlePropertyFieldCreatedOrUpdated', true);

            // The event carries a group_id but no group name, so there is no way to tell
            // from here whether this field is ours. What we can tell is that we do not
            // know our group id yet — which happens when the last fetch found no fields
            // and stamped its one-hour cache. Without this, the first attribute an
            // administrator creates stays invisible for the rest of that hour.
            //
            // Narrowed to the object types this feature owns, and self-limiting: once
            // the fetch publishes the id, this stops firing.
            if (OWNED_OBJECT_TYPES.has(field.object_type) && !(await getAccessControlGroupId(database))) {
                fetchAccessControlAttributeFields(serverUrl, true);
            }
        });
    } catch (error) {
        logError('handlePropertyFieldCreatedOrUpdated', getFullErrorMessage(error));
    }
}

export async function handlePropertyFieldDeleted(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {field_id?: string; object_type?: string};
    if (!data.field_id) {
        logDebug('handlePropertyFieldDeleted', 'No field_id in WS event');
        return;
    }

    try {
        await EphemeralStore.runExclusive(accessControlWriteLockKey(serverUrl), async () => {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const models = await operator.handlePropertyFields({fields: [{id: data.field_id, delete_at: Date.now()} as PropertyField], prepareRecordsOnly: true});
            await operator.batchRecords(models, 'handlePropertyFieldDeleted', true);
        });
    } catch (error) {
        logError('handlePropertyFieldDeleted', getFullErrorMessage(error));
    }
}

// Stamping delete_at is how the operator is told to remove a row; it has no
// delete-by-query path for values. Prepared and committed as one propagated
// batch so a failed write throws rather than silently leaving stale rows.
async function destroyValues(serverUrl: string, operator: ServerDataOperator, stale: PropertyValueModel[], description: string) {
    if (!stale.length) {
        return;
    }

    const lockKeys = [...new Set(stale.map((value) => {
        if (value.targetType === 'channel') {
            return channelAttributeWriteLockKey(serverUrl, value.targetId);
        }
        if (value.targetType === 'system') {
            return accessControlWriteLockKey(serverUrl);
        }
        return '';
    }).filter(Boolean))].sort();

    const commit = async () => {
        const models = await operator.handlePropertyValues({
            values: stale.map((v) => ({id: v.id, delete_at: Date.now()} as PropertyValue)),
            prepareRecordsOnly: true,
        });
        await operator.batchRecords(models, description, true);
    };
    const withLock = (index: number): Promise<void> => {
        const key = lockKeys[index];
        return key ? EphemeralStore.runExclusive(key, () => withLock(index + 1)) : commit();
    };
    await withLock(0);
}

export async function handlePropertyValuesUpdated(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as PropertyValuesUpdatedData;
    if (!data.values) {
        return;
    }

    const values = safeParseJSON(data.values) as Array<PropertyValue<string>> | string;
    if (typeof values === 'string') {
        logDebug('handlePropertyValuesUpdated', 'Failed to parse values from WS event');
        return;
    }

    // The server sends this event in four shapes, and they need different writes:
    //
    //   upsert                -> target_id + only the values just written
    //   single delete         -> target_id + that one value, delete_at set
    //   all values on target  -> target_id + an empty list
    //   all values on a field -> field_id  + an empty list
    //
    // So a non-empty list is a merge, never authoritative: passing targetId there
    // would prune every other attribute on the channel whenever one is edited. An
    // empty list is the opposite — it carries no ids, so it can only be acted on
    // as a prune, which is why it must not be treated as a no-op.
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        if (values.length) {
            const persistValues = async () => {
                const models = await operator.handlePropertyValues({values, prepareRecordsOnly: true});
                await operator.batchRecords(models, 'handlePropertyValuesUpdated', true);
            };
            const targetId = data.target_id ?? values[0].target_id;
            if (values.some((value) => value.target_type === 'channel')) {
                // Serialized against the REST full-channel fetch and
                // setChannelAttributeValue for the same channel, so this upsert
                // cannot land in the gap between that fetch's read and its write.
                await EphemeralStore.runExclusive(channelAttributeWriteLockKey(serverUrl, targetId), persistValues);
                return;
            }

            if (values.some((value) => value.target_type === 'system')) {
                await EphemeralStore.runExclusive(accessControlWriteLockKey(serverUrl), persistValues);
                return;
            }

            await persistValues();
            return;
        }

        if (data.target_id) {
            // This event carries no group identity, so an "all cleared" broadcast
            // from another property group sharing this table (managed channel
            // categories, custom profile attributes) is indistinguishable from one
            // for access_control. Deleting locally here would apply someone else's
            // clear to our data. Instead, force a group-scoped REST reconciliation:
            // if the clear really was ours, the fetch will observe it and prune;
            // if it belonged to another group, the fetch finds our values
            // unchanged and nothing is lost.
            await fetchChannelAttributeValues(serverUrl, data.target_id, true);
            return;
        }

        if (data.field_id) {
            // Safe to key on the field alone: a value belongs to exactly one field,
            // so this cannot reach another group's rows.
            await destroyValues(serverUrl, operator, await getPropertyValuesByFieldId(database, data.field_id), 'handlePropertyValuesUpdated');
            return;
        }

        logDebug('handlePropertyValuesUpdated', 'Empty values with no target or field to prune');
    } catch (error) {
        logError('handlePropertyValuesUpdated', getFullErrorMessage(error));
    }
}
