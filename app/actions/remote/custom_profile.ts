// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {customProfileAttributeId} from '@utils/custom_profile_attribute';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {convertValueForServer} from '@utils/user';

import type Model from '@nozbe/watermelondb/Model';
import type {CustomProfileField, CustomAttribute, CustomAttributeSet, CustomProfileAttribute, UserCustomProfileAttributeSimple} from '@typings/api/custom_profile_attributes';

/**
 * Fetches custom profile attribute values for a user
 * @param serverUrl - The server URL
 * @param userId - The user ID
 * @param filterEmpty - Whether to filter out empty values
 * @returns Promise with the custom profile attributes or error
 */
export const fetchCustomProfileAttributes = async (serverUrl: string, userId: string, filterEmpty = false): Promise<{attributes: CustomAttributeSet; error: unknown}> => {
    const attributes: Record<string, CustomAttribute> = {};
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        let fields: CustomProfileField[] = [];
        let attrValues: Record<string, string | string[]> = {};

        try {
            [fields, attrValues] = await Promise.all([
                client.getCustomProfileAttributeFields(),
                client.getCustomProfileAttributeValues(userId),
            ]);

        } catch (err) {
            logError('error on fetchCustomProfileAttributes get fields and attr values', getFullErrorMessage(err));
            return {attributes, error: err};
        }

        if (fields.length === 0) {
            return {attributes, error: undefined};
        }

        try {
            // Process each field to build attributes and collect promises
            const attributeModelPromises: Array<Promise<Model[]>> = [];
            const fieldModelPromises: Array<Promise<Model[]>> = [];
            for (const field of fields) {
                const rawValue = attrValues[field.id];
                let value = '';

                // Handle different value types properly
                if (rawValue !== undefined && rawValue !== null) {
                    if (Array.isArray(rawValue)) {
                        // For arrays (multiselect), serialize to JSON string
                        value = JSON.stringify(rawValue);
                    } else {
                        // For other types, convert to string
                        value = String(rawValue);
                    }
                }

                if (!filterEmpty || value) {
                    attributes[field.id] = {
                        id: field.id,
                        name: field.name,
                        type: field.type || 'text',
                        value,
                        sort_order: field.attrs?.sort_order,
                    };

                    attributeModelPromises.push(operator.handleCustomProfileAttributes({
                        attributes: [{
                            id: customProfileAttributeId(field.id, userId),
                            field_id: field.id,
                            user_id: userId,
                            value,
                        }],
                        prepareRecordsOnly: true,
                    }));
                    fieldModelPromises.push(operator.handleCustomProfileFields({
                        fields: [field],
                        prepareRecordsOnly: true,
                    }));
                }
            }

            const [fieldResults, attributeResults] = await Promise.all([
                Promise.all(fieldModelPromises),
                Promise.all(attributeModelPromises),
            ]);
            const fieldBatch = fieldResults.flat();
            const attributeBatch = attributeResults.flat();

            if (fieldBatch.length > 0) {
                await operator.batchRecords(fieldBatch, 'updateCustomProfileFields');
            }

            if (attributeBatch.length > 0) {
                await operator.batchRecords(attributeBatch, 'updateCustomProfileAttributes');
            }

        } catch (err) {
            logError('error on fetchCustomProfileAttributes field iteration', getFullErrorMessage(err));
            return {attributes, error: err};
        }

        return {attributes, error: undefined};
    } catch (error) {
        logError('error on fetchCustomProfileAttributes', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {attributes, error};
    }
};

/**
 * Updates custom profile attributes for the current user
 * @param serverUrl - The server URL
 * @param userId - The user ID
 * @param attributes - The attributes to update
 * @returns Promise with success status or error
 */
export const updateCustomProfileAttributes = async (serverUrl: string, userId: string, attributes: CustomAttributeSet): Promise<{success: boolean; error: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const attributeValues: UserCustomProfileAttributeSimple = {};

        // Convert attributes to the format expected by the API
        Object.entries(attributes).forEach(([id, attr]) => {
            attributeValues[id] = convertValueForServer(attr.value, attr.type);
        });

        // Update on the server
        await client.updateCustomProfileAttributeValues(attributeValues);

        // Store in the database
        const attributesForDatabase: CustomProfileAttribute[] = Object.entries(attributes).map(([fieldId, attr]) => ({
            id: customProfileAttributeId(fieldId, userId),
            field_id: fieldId,
            user_id: userId,
            value: attr.value,
        }));

        if (attributesForDatabase.length > 0) {
            await operator.handleCustomProfileAttributes({
                attributes: attributesForDatabase,
                prepareRecordsOnly: false,
            });
        }

        return {success: true, error: undefined};
    } catch (error) {
        logError('error on updateCustomProfileAttributes', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {success: false, error};
    }
};
