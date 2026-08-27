// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAccessControlAttributeFields} from '@actions/remote/classification';
import {CHANNEL_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import {CLASSIFICATIONS_SYSTEM_OBJECT_TYPE} from '@constants/classification';
import DatabaseManager from '@database/manager';
import {getAccessControlGroupId, getAccessControlValuesForTarget, getPropertyValuesByFieldId} from '@queries/servers/properties';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import type {PropertyValueModel} from '@database/models/server';
import type ServerDataOperator from '@database/operator/server_data_operator';

// The object types the channel-attributes feature owns inside the shared
// access_control group.
const OWNED_OBJECT_TYPES = new Set<PropertyFieldObjectType>([CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CHANNEL_ATTRIBUTE_OBJECT_TYPE]);

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
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [field], prepareRecordsOnly: false});

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
    } catch (error) {
        logError('handlePropertyFieldCreatedOrUpdated', error);
    }
}

export async function handlePropertyFieldDeleted(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {field_id?: string; object_type?: string};
    if (!data.field_id) {
        logDebug('handlePropertyFieldDeleted', 'No field_id in WS event');
        return;
    }

    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [{id: data.field_id, delete_at: Date.now()} as PropertyField], prepareRecordsOnly: false});
    } catch (error) {
        logError('handlePropertyFieldDeleted', error);
    }
}

// Stamping delete_at is how the operator is told to remove a row; it has no
// delete-by-query path for values.
async function destroyValues(operator: ServerDataOperator, stale: PropertyValueModel[]) {
    if (!stale.length) {
        return;
    }

    await operator.handlePropertyValues({
        values: stale.map((v) => ({id: v.id, delete_at: Date.now()} as PropertyValue)),
        prepareRecordsOnly: false,
    });
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
            await operator.handlePropertyValues({values, prepareRecordsOnly: false});
            return;
        }

        if (data.target_id) {
            // Deliberately not handlePropertyValues({targetId}): that deletes every
            // stored value for the target regardless of which property group it
            // belongs to, and this is the one handler for every group's events.
            // Managed channel categories keeps per-channel values in the same
            // table, so an "all cleared" event for one group would delete another
            // feature's data for that channel.
            const stale = await getAccessControlValuesForTarget(database, data.target_id);
            await destroyValues(operator, stale);
            return;
        }

        if (data.field_id) {
            // Safe to key on the field alone: a value belongs to exactly one field,
            // so this cannot reach another group's rows.
            await destroyValues(operator, await getPropertyValuesByFieldId(database, data.field_id));
            return;
        }

        logDebug('handlePropertyValuesUpdated', 'Empty values with no target or field to prune');
    } catch (error) {
        logError('handlePropertyValuesUpdated', error);
    }
}
