// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Access Control (ABAC)
// See https://api.mattermost.com/#tag/access-control
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

// ------------------------------------------------------------
// ABAC Config
// ------------------------------------------------------------

/**
 * Enable Attribute-Based Access Control (ABAC) via server config.
 * Requires admin session.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiEnableABAC = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.put(`${baseUrl}/api/v4/config/patch`, {
            AccessControlSettings: {
                EnableAttributeBasedAccessControl: true,
            },
        });
        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

// ------------------------------------------------------------
// Custom Profile Attribute Fields
// Used to define user attributes that ABAC policies can reference.
// See /api/v4/custom_profile_attributes/fields
// ------------------------------------------------------------

/**
 * List all custom profile attribute fields.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {fields} on success or {error, status} on error
 */
export const apiGetCustomProfileAttributeFields = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/custom_profile_attributes/fields`);
        return {fields: response.data ?? []};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a custom profile attribute field by ID.
 * @param {string} baseUrl - the base server URL
 * @param {string} fieldId - the field ID to delete
 * @return {Object} returns {} on success or {error, status} on error
 */
export const apiDeleteCustomProfileAttributeField = async (baseUrl: string, fieldId: string): Promise<any> => {
    try {
        await client.delete(`${baseUrl}/api/v4/custom_profile_attributes/fields/${fieldId}`);
        return {};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Find an existing custom profile attribute field by name, or create it if absent.
 * Returns {field, created} where created=true means this call created the field
 * and the caller is responsible for deleting it in cleanup.
 * @param {string} baseUrl - the base server URL
 * @param {string} name - field name to look up or create
 * @param {string} [type] - field type when creating, defaults to 'text'
 * @return {Object} returns {field, created} on success or {error, status} on error
 */
export const apiGetOrCreateCustomProfileAttributeField = async (
    baseUrl: string,
    name: string,
    type = 'text',
): Promise<any> => {
    const {fields, error: listError} = await apiGetCustomProfileAttributeFields(baseUrl);
    if (listError) {
        return {error: listError};
    }
    const existing = fields.find((f: any) => f.name === name);
    if (existing) {
        return {field: existing, created: false};
    }
    const {field, error: createError} = await apiCreateCustomProfileAttributeField(baseUrl, name, type);
    if (createError) {
        return {error: createError};
    }
    return {field, created: true};
};

/**
 * Create a custom profile attribute field.
 * The returned field ID is required when setting attribute values on users.
 * @param {string} baseUrl - the base server URL
 * @param {string} name - display name for the field, e.g. "Department"
 * @param {string} [type] - field type, defaults to 'text'
 * @return {Object} returns {field} on success or {error, status} on error
 */
export const apiCreateCustomProfileAttributeField = async (
    baseUrl: string,
    name: string,
    type = 'text',
): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/custom_profile_attributes/fields`,
            {
                name,
                type,
                attrs: {
                    visibility: 'when_set',
                    sort_order: 0,
                },
            },
        );
        return {field: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Set one or more property values on a user.
 * Used to assign ABAC-relevant attributes (e.g. Department) before policy evaluation.
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the target user ID
 * @param {Record<string, string>} values - map of field ID → value, e.g. { [fieldId]: 'Engineering' }
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiSetUserPropertyValues = async (
    baseUrl: string,
    userId: string,
    values: Record<string, string>,
): Promise<any> => {
    try {
        const response = await client.patch(
            `${baseUrl}/api/v4/users/${userId}/custom_profile_attributes`,
            values,
        );
        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

// ------------------------------------------------------------
// Permission Policies
// Controls which users can perform actions (e.g. download_file_attachment).
// CEL expression options:
//   "false"                                      → denies everyone unconditionally
//   "true"                                       → grants everyone (no restriction)
//   "user.attributes.Department == \"Engineering\"" → grants only matching users
// ------------------------------------------------------------

/**
 * Create an ABAC permission policy.
 * Requires admin session and ABAC to be enabled.
 * @param {string} baseUrl - the base server URL
 * @param {string} name - unique policy name
 * @param {Array<{actions: string[]; expression: string}>} rules - policy rules; each rule maps actions to a CEL expression
 * @param {string[]} [roles] - roles the policy applies to, e.g. ['system_user']. Defaults to ['system_user']
 * @return {Object} returns {policy} on success or {error, status} on error
 */
export const apiCreatePermissionPolicy = async (
    baseUrl: string,
    name: string,
    rules: Array<{actions: string[]; expression: string}>,
    roles: string[] = ['system_user'],
): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/access_control_policies`,
            {
                name,
                type: 'permission',
                roles,
                rules,
            },
        );
        return {policy: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete an access control policy by ID.
 * Requires admin session.
 * @param {string} baseUrl - the base server URL
 * @param {string} policyId - the policy ID to delete
 * @return {Object} returns {} on success or {error, status} on error
 */
export const apiDeletePermissionPolicy = async (baseUrl: string, policyId: string): Promise<any> => {
    try {
        await client.delete(`${baseUrl}/api/v4/access_control_policies/${policyId}`);
        return {};
    } catch (err) {
        return getResponseFromError(err);
    }
};

// ------------------------------------------------------------
// Channel (Membership) Policies
// Controls which users can access / remain members of a channel
// based on their attributes (CEL expression evaluated per user).
// ------------------------------------------------------------

/**
 * Activate or deactivate an access control policy.
 * A policy must be active to be enforced by the server.
 * Uses PUT /api/v4/access_control_policies/activate with entries array.
 * @param {string} baseUrl - the base server URL
 * @param {string} policyId - the policy ID
 * @param {boolean} [active] - true to activate (default), false to deactivate
 * @return {Object} returns {} on success or {error, status} on error
 */
export const apiSetPolicyActive = async (
    baseUrl: string,
    policyId: string,
    active = true,
): Promise<any> => {
    try {
        await client.put(
            `${baseUrl}/api/v4/access_control_policies/activate`,
            {entries: [{id: policyId, active}]},
        );
        return {};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const AccessControl = {
    apiEnableABAC,
    apiGetCustomProfileAttributeFields,
    apiGetOrCreateCustomProfileAttributeField,
    apiCreateCustomProfileAttributeField,
    apiDeleteCustomProfileAttributeField,
    apiSetUserPropertyValues,
    apiCreatePermissionPolicy,
    apiDeletePermissionPolicy,
    apiSetPolicyActive,
};

export default AccessControl;
