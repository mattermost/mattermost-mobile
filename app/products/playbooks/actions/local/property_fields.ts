// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

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

        // Handle property fields
        if (propertyFields.length) {
            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });
        }

        // Handle property values
        if (propertyValues.length) {
            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });
        }

        return {data: true};
    } catch (error) {
        logError('failed to handle playbook run property fields', error);
        return {error};
    }
}
