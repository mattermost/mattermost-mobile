// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getPersistedPropertyFields, getPersistedPropertyValues} from '@queries/servers/properties';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

export async function handlePropertyFieldCreatedOrUpdated(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {property_field?: string; object_type?: string};
    if (!data.property_field) {
        return;
    }

    const field = safeParseJSON(data.property_field) as PropertyField | string;
    if (typeof field === 'string') {
        logDebug('handlePropertyFieldCreatedOrUpdated', 'Failed to parse property_field from WS event');
        return;
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const existingFields = await getPersistedPropertyFields(database);

        const groupFields = [...(existingFields[field.group_id] ?? [])];
        const idx = groupFields.findIndex((f) => f.id === field.id);
        if (idx >= 0) {
            groupFields[idx] = field;
        } else {
            groupFields.push(field);
        }

        const mergedFields = {...existingFields, [field.group_id]: groupFields};

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: mergedFields}],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('handlePropertyFieldCreatedOrUpdated', error);
    }
}

export async function handlePropertyFieldDeleted(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {field_id?: string; object_type?: string};
    if (!data.field_id) {
        return;
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const existingFields = await getPersistedPropertyFields(database);

        let found = false;
        const mergedFields: Record<string, PropertyField[]> = {};
        for (const [groupId, fields] of Object.entries(existingFields)) {
            const filtered = fields.filter((f) => f.id !== data.field_id);
            mergedFields[groupId] = filtered;
            if (filtered.length !== fields.length) {
                found = true;
            }
        }

        if (!found) {
            return;
        }

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: mergedFields}],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('handlePropertyFieldDeleted', error);
    }
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

    if (values.length === 0) {
        return;
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const existingValues = await getPersistedPropertyValues(database);

        const merged = {...existingValues};
        for (const v of values) {
            const targetValues = [...(merged[v.target_id] ?? [])];
            const idx = targetValues.findIndex((existing) => existing.field_id === v.field_id);
            if (idx >= 0) {
                targetValues[idx] = v;
            } else {
                targetValues.push(v);
            }
            merged[v.target_id] = targetValues;
        }

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: merged}],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('handlePropertyValuesUpdated', error);
    }
}
