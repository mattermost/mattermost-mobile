// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {CustomProfileField, CustomAttribute, CustomAttributeSet} from '@typings/api/custom_profile_attributes';

/**
 * Fetches custom profile fields from the server
 * @param serverUrl - The server URL
 * @returns Promise with the custom profile fields or error
 */
export const fetchCustomProfileFields = async (serverUrl: string): Promise<{fields?: CustomProfileField[]; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const fields = await client.getCustomProfileAttributeFields();

        if (fields?.length > 0) {
            // Store fields in the database if needed
            // This requires access to the database manager which is not available in this context
            return {fields, error: undefined};
        }
        return {fields: [], error: undefined};
    } catch (error) {
        logDebug('error on fetchCustomProfileFields', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {fields: [], error};
    }
};

/**
 * Fetches custom profile attribute values for a user
 * @param serverUrl - The server URL
 * @param userId - The user ID
 * @param filterEmpty - Whether to filter out empty values
 * @returns Promise with the custom profile attributes or error
 */
export const fetchCustomProfileAttributes = async (serverUrl: string, userId: string, filterEmpty = false): Promise<{attributes: CustomAttributeSet; error: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const [fields, attrValues] = await Promise.all([
            client.getCustomProfileAttributeFields(),
            client.getCustomProfileAttributeValues(userId),
        ]);

        if (fields?.length > 0) {
            const attributes: Record<string, CustomAttribute> = {};
            fields.forEach((field: CustomProfileField) => {
                // Use type assertion to handle the index access
                const value = (attrValues as Record<string, string>)[field.id] || '';
                if (!filterEmpty || value) {
                    attributes[field.id] = {
                        id: field.id,
                        name: field.name,
                        value,
                        sort_order: field.attrs?.sort_order,
                    };
                }
            });
            return {attributes, error: undefined};
        }
        return {attributes: {} as Record<string, CustomAttribute>, error: undefined};
    } catch (error) {
        logDebug('error on fetchCustomProfileAttributes', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {attributes: {} as Record<string, CustomAttribute>, error};
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
        const attributeValues: Record<string, string> = {};

        // Convert attributes to the format expected by the API
        Object.entries(attributes).forEach(([id, attr]) => {
            attributeValues[id] = attr.value;
        });

        // Use type assertion to match the expected API parameter type
        await client.updateCustomProfileAttributeValues(attributeValues as any);

        // Note: The following code is commented out as it would require database access
        // If we need to store the updated attributes in the database, we would transform them
        // into the CustomProfileAttributeSimple format with user_id and field_id
        /*
        const attributesForDatabase = Object.entries(attributes).map(([fieldId, attr]) => ({
            field_id: fieldId,
            user_id: userId,
            value: attr.value,
        }));

        // Here we would call the database operator to store the attributes
        */

        return {success: true, error: undefined};
    } catch (error) {
        logDebug('error on updateCustomProfileAttributes', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {success: false, error};
    }
};
