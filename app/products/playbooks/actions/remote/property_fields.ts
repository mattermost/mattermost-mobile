// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {handlePlaybookRunPropertyFields} from '@playbooks/actions/local/property_fields';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

/**
 * Fetch property fields and values for a playbook run from the server and store them in the database
 * @param serverUrl - The server URL
 * @param runId - The playbook run ID
 * @param fetchOnly - If true, only fetch from server without storing in DB
 * @returns Promise with error if any
 */
export const fetchPlaybookRunPropertyFields = async (
    serverUrl: string,
    runId: string,
    fetchOnly = false,
): Promise<{error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        // Fetch property fields and values from the server
        const [propertyFields, propertyValues] = await Promise.all([
            client.fetchRunPropertyFields(runId),
            client.fetchRunPropertyValues(runId),
        ]);

        // Store in database if not fetchOnly
        if (!fetchOnly) {
            const result = await handlePlaybookRunPropertyFields(
                serverUrl,
                propertyFields,
                propertyValues,
            );
            if (result.error) {
                logDebug('error on handlePlaybookRunPropertyFields', getFullErrorMessage(result.error));
                return {error: result.error};
            }
        }

        return {};
    } catch (error) {
        logDebug('error on fetchPlaybookRunPropertyFields', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

/**
 * Update a property value for a playbook run on the server and locally
 * @param serverUrl - The server URL
 * @param runId - The playbook run ID
 * @param fieldId - The property field ID
 * @param value - The new value (string for text/select, comma-separated string for multiselect)
 * @param fieldType - The type of the field ('text', 'select', 'multiselect')
 * @returns Promise with updated property value or error
 */
export const updatePlaybookRunPropertyValue = async (
    serverUrl: string,
    runId: string,
    fieldId: string,
    value: string,
    fieldType?: string,
): Promise<{error?: unknown; propertyValue?: PlaybookRunPropertyValue}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        // Update value on server
        const propertyValue = await client.setRunPropertyValue(runId, fieldId, value, fieldType);

        // Update local database
        const result = await handlePlaybookRunPropertyFields(
            serverUrl,
            [],
            [propertyValue],
        );

        if (result.error) {
            logDebug('error on handlePlaybookRunPropertyFields after update', getFullErrorMessage(result.error));
            return {error: result.error};
        }

        return {propertyValue};
    } catch (error) {
        logDebug('error on updatePlaybookRunPropertyValue', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
