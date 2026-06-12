// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPropertyFieldById} from '@queries/servers/properties';
import {safeParseJSON} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import type Model from '@nozbe/watermelondb/Model';

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
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [field], prepareRecordsOnly: false});
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
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const field = await getPropertyFieldById(database, data.field_id);
        if (!field) {
            return;
        }

        const values = await field.propertyValues.fetch();
        const batch: Model[] = [
            field.prepareDestroyPermanently(),
            ...values.map((v) => v.prepareDestroyPermanently()),
        ];

        await operator.batchRecords(batch, 'handlePropertyFieldDeleted');
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
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values, prepareRecordsOnly: false});
    } catch (error) {
        logError('handlePropertyValuesUpdated', error);
    }
}
