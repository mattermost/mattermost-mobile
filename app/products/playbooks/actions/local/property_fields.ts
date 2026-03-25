// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

import type Model from '@nozbe/watermelondb/Model';

/**
 * Store property fields and values in the local database
 * @param serverUrl - The server URL
 * @param propertyFields - Array of property field records to store
 * @param propertyValues - Array of property value records to store
 * @returns Promise with data or error
 */
export async function handlePlaybookRunPropertyFields(
    serverUrl: string,
    propertyFields: PlaybookRunPropertyField[],
    propertyValues: PlaybookRunPropertyValue[],
) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Prepare records for batching
        const batch: Model[] = [];

        // Handle property fields
        if (propertyFields.length) {
            const propertyFieldRecords = await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: true,
            });
            batch.push(...propertyFieldRecords);
        }

        // Handle property values
        if (propertyValues.length) {
            const propertyValueRecords = await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: true,
            });
            batch.push(...propertyValueRecords);
        }

        // Batch all records together in a single database operation
        if (batch.length) {
            await operator.batchRecords(batch, 'handlePlaybookRunPropertyFields');
        }

        return {data: true};
    } catch (error) {
        logError('failed to handle playbook run property fields', error);
        return {error};
    }
}
