// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FormData from 'form-data';

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

/**
 * Disable Attribute-Based Access Control (ABAC) via server config.
 * Requires admin session.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiDisableABAC = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.put(`${baseUrl}/api/v4/config/patch`, {
            AccessControlSettings: {
                EnableAttributeBasedAccessControl: false,
            },
        });
        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a permission policy that denies a file action for all users.
 * Uses CEL expression "false" to unconditionally deny the specified actions.
 * Requires admin session and ABAC to be enabled.
 * @param {string} baseUrl - the base server URL
 * @param {string} name - unique policy name
 * @param {string[]} actions - actions to deny, e.g. ['download_file_attachment']
 * @return {Object} returns {policy} on success or {error, status} on error
 */
export const apiCreatePermissionPolicy = async (
    baseUrl: string,
    name: string,
    actions: string[],
): Promise<any> => {
    try {
        const payload = {
            name,
            type: 'permission',
            props: {
                rules: actions.map((action) => ({
                    actions: [action],
                    expression: 'false',
                })),
            },
        };
        const response = await client.post(`${baseUrl}/api/v4/access_control_policies`, payload);
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

/**
 * Upload a file to a channel via the Mattermost files API.
 * Requires a user session that has access to the channel.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - the channel to associate the file with
 * @param {string} fileName - the filename to use
 * @param {Buffer|string} fileContent - the file content
 * @return {Object} returns {fileId} on success or {error, status} on error
 */
export const apiUploadFileToChannel = async (
    baseUrl: string,
    channelId: string,
    fileName: string,
    fileContent: Buffer | string,
): Promise<any> => {
    const formData = new FormData();
    formData.append('files', Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent), {filename: fileName});
    formData.append('channel_id', channelId);

    try {
        const response = await client.request({
            url: `${baseUrl}/api/v4/files`,
            method: 'POST',
            data: formData,
            headers: formData.getHeaders(),
        });

        const fileId = response.data?.file_infos?.[0]?.id;
        if (!fileId) {
            return {error: {message: 'No file_id returned from upload'}};
        }
        return {fileId};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const AccessControl = {
    apiEnableABAC,
    apiDisableABAC,
    apiCreatePermissionPolicy,
    apiDeletePermissionPolicy,
    apiUploadFileToChannel,
};

export default AccessControl;
