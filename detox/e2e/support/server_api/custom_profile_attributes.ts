// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Custom Profile Attributes
// See https://api.mattermost.com/#tag/custom-profile-attributes
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Create a custom profile attribute field (admin only).
 * @param {string} baseUrl - the base server URL
 * @param {Object} field - field definition ({name, type})
 * @return {Object} returns {field} on success or {error, status} on error
 */
export const apiCreateCustomProfileAttributeField = async (baseUrl: string, field: {name: string; type?: string}): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/custom_profile_attributes/fields`,
            {
                type: 'text',
                ...field,
            },
        );
        return {field: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a custom profile attribute field (admin only).
 * @param {string} baseUrl - the base server URL
 * @param {string} fieldId - the field ID to delete
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiDeleteCustomProfileAttributeField = async (baseUrl: string, fieldId: string): Promise<any> => {
    try {
        return await client.delete(`${baseUrl}/api/v4/custom_profile_attributes/fields/${fieldId}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update custom profile attribute values for the current user.
 * @param {string} baseUrl - the base server URL
 * @param {Object} values - map of field ID to value string
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUpdateCustomProfileAttributeValues = async (baseUrl: string, values: Record<string, string>): Promise<any> => {
    try {
        return await client.patch(
            `${baseUrl}/api/v4/custom_profile_attributes/values`,
            values,
        );
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const CustomProfileAttributes = {
    apiCreateCustomProfileAttributeField,
    apiDeleteCustomProfileAttributeField,
    apiUpdateCustomProfileAttributeValues,
};

export default CustomProfileAttributes;
