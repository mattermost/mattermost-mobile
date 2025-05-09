// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import {ATTRIBUTE_HANDLER_DESCRIPTION, FIELD_HANDLER_DESCRIPTION} from '@database/operator/server_data_operator/handlers/custom_profile';
import NetworkManager from '@managers/network_manager';
import {customProfileAttributeId} from '@utils/custom_profile_attribute';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

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
        const [fields, attrValues] = await Promise.all([
            client.getCustomProfileAttributeFields(),
            client.getCustomProfileAttributeValues(userId),
        ]);

        const fieldBatch: Model[] = [];
        const attributeBatch: Model[] = [];
        if (fields?.length > 0) {

            if (fields?.length > 0) {

                await Promise.all(fields.map(async (field: CustomProfileField) => {
                    const value = (attrValues as Record<string, string>)[field.id] || '';
                    if (!filterEmpty || value) {
                        attributes[field.id] = {
                            id: field.id,
                            name: field.name,
                            value,
                            sort_order: field.attrs?.sort_order,
                        };
                        const attributeModel = await operator.handleCustomProfileAttributes({
                            attributes: [{
                                id: customProfileAttributeId(field.id, userId),
                                field_id: field.id,
                                user_id: userId,
                                value,
                            }],
                            prepareRecordsOnly: true,
                        });
                        attributeBatch.push(...attributeModel);
                        const fieldModels = await operator.handleCustomProfileFields({
                            fields,
                            prepareRecordsOnly: true,
                        });
                        fieldBatch.push(...fieldModels);
                    }
                }));
                if (fieldBatch.length > 0) {
                    await operator.batchRecords(fieldBatch, FIELD_HANDLER_DESCRIPTION);
                    await operator.batchRecords(attributeBatch, ATTRIBUTE_HANDLER_DESCRIPTION);
                }
            }
        }
        return {attributes, error: undefined};
    } catch (error) {
        logDebug('error on fetchCustomProfileAttributes', getFullErrorMessage(error));
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
            attributeValues[id] = attr.value;
        });

        // Update on the server
        await client.updateCustomProfileAttributeValues(attributeValues);

        // Store in the database
        const attributesForDatabase: CustomProfileAttribute[] = Object.entries(attributes).map(([fieldId, attr]) => ({
            id: `${fieldId}-${userId}`,
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
        logDebug('error on updateCustomProfileAttributes', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {success: false, error};
    }
};
