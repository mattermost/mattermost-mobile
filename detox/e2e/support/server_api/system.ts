// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'path';

import jestExpect from 'expect';

import client from './client';
import {apiUploadFile, getResponseFromError} from './common';

// ****************************************************************
// System
// See https://api.mattermost.com/#tag/system
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/* eslint-disable no-console */

/**
 * Check system health.
 * @param {string} baseUrl - the base server URL
 */
export const apiCheckSystemHealth = async (baseUrl: string): Promise<any> => {
    const result = await apiPingServerStatus(baseUrl);

    // apiPingServerStatus returns {data} on success, {error, status} on failure.
    // Guard against the error path so callers get a descriptive error, not a TypeError.
    if (!result || result.error || !result.data) {
        const detail = result?.error
            ? JSON.stringify(result.error)
            : 'No response from server';
        throw new Error(`apiCheckSystemHealth: server at "${baseUrl}" is not healthy. ${detail}`);
    }

    const {data} = result;
    jestExpect(data.status).toEqual('OK');
    jestExpect(data.database_status).toEqual('OK');
    jestExpect(data.filestore_status).toEqual('OK');
};

/**
 * Send a test email.
 * See https://api.mattermost.com/#operation/TestEmail
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiEmailTest = async (baseUrl: string): Promise<any> => {
    try {
        return await client.post(`${baseUrl}/api/v4/email/test`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get client license.
 * See https://api.mattermost.com/#operation/GetClientLicense
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {license} on success or {error, status} on error
 */
export const apiGetClientLicense = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/license/client?format=old`);

        return {license: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get client config (old format), same shape as the mobile app uses for About.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {config} on success or {error, status} on failure
 */
export const apiGetClientConfigOld = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/config/client?format=old`);

        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get configuration.
 * See https://api.mattermost.com/#operation/GetConfig
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiGetConfig = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/config`);

        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Update server configuration.
 * See https://api.mattermost.com/#operation/UpdateConfig
 * @param {string} baseUrl - the base server URL
 * @param {Object} newConfig - partial configuration object to merge with current config
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiUpdateConfig = async (baseUrl: string, newConfig: any): Promise<any> => {
    try {
        // Use config/patch endpoint for partial updates — no need to GET+merge+PUT the full config
        const response = await client.put(`${baseUrl}/api/v4/config/patch`, newConfig);
        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Patch server configuration (partial update; server merges with current config).
 * See https://api.mattermost.com/#operation/PatchConfig
 * @param {string} baseUrl - the base server URL
 * @param {Object} patchConfig - partial configuration object (same struct keys as server Config)
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiPatchConfig = async (baseUrl: string, patchConfig: any): Promise<any> => {
    try {
        const response = await client.put(`${baseUrl}/api/v4/config/patch`, patchConfig);
        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get remote clusters (connected workspaces).
 * See https://api.mattermost.com/#tag/remote_cluster
 * Requires system admin. Use before tests that need "no connected workspaces" (e.g. TC-MOB-03).
 * @param {string} baseUrl - the base server URL
 * @param {Object} options - optional query (only_confirmed, etc.)
 * @return {Object} returns {remotes: Array<{remote_id: string, ...}>} on success or {error, status} on error
 */
export const apiGetRemoteClusters = async (
    baseUrl: string,
    options: {onlyConfirmed?: boolean; excludePlugins?: boolean} = {},
): Promise<{remotes?: Array<{remote_id: string}>; error?: {message: string}; status?: number}> => {
    try {
        const params = new URLSearchParams();
        if (options.onlyConfirmed !== undefined) {
            params.set('only_confirmed', String(options.onlyConfirmed));
        }
        if (options.excludePlugins !== undefined) {
            params.set('exclude_plugins', String(options.excludePlugins));
        }
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await client.get(`${baseUrl}/api/v4/remotecluster${qs}`);
        return {remotes: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a remote cluster.
 * See https://api.mattermost.com/#tag/remote_cluster
 * Requires system admin.
 * @param {string} baseUrl - the base server URL
 * @param {string} remoteId - the remote cluster id
 * @return {Object} returns on success or {error, status} on error
 */
export const apiDeleteRemoteCluster = async (
    baseUrl: string,
    remoteId: string,
): Promise<{error?: {message: string}; status?: number}> => {
    try {
        await client.delete(`${baseUrl}/api/v4/remotecluster/${encodeURIComponent(remoteId)}`);
        return {};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete all remote clusters on the server.
 * Call as admin (e.g. after User.apiAdminLogin) so tests can assert "No connected workspaces" (e.g. TC-MOB-03).
 * @param {string} baseUrl - the base server URL
 */
export const apiDeleteAllRemoteClusters = async (baseUrl: string): Promise<void> => {
    const result = await apiGetRemoteClusters(baseUrl, {});
    if (result.error || !result.remotes) {
        return;
    }
    for (const r of result.remotes) {
        // eslint-disable-next-line no-await-in-loop
        await apiDeleteRemoteCluster(baseUrl, r.remote_id);
    }
};

/**
 * Create a remote cluster (connected workspace). Requires system admin.
 * See https://api.mattermost.com/#tag/remote_cluster
 */
export const apiCreateRemoteCluster = async (
    baseUrl: string,
    payload: {
        name: string;
        display_name: string;
        default_team_id: string;
        password: string;
    },
): Promise<Record<string, unknown> & {error?: {message: string}; status?: number}> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/remotecluster`, payload);
        return response.data ?? {};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Ensures at least one confirmed remote cluster exists (matches web e2e ensureConfirmedRemote).
 * Enables remote cluster service when creating. Call as admin after EnableSharedChannels is on.
 */
export const apiEnsureAtLeastOneConfirmedRemoteCluster = async (baseUrl: string, teamId: string): Promise<void> => {
    const confirmed = await apiGetRemoteClusters(baseUrl, {
        onlyConfirmed: true,
        excludePlugins: true,
    });
    const list = Array.isArray(confirmed.remotes) ? confirmed.remotes : [];
    if (list.length > 0) {
        return;
    }
    await apiPatchConfig(baseUrl, {
        ConnectedWorkspacesSettings: {
            EnableRemoteClusterService: true,
        },
    });
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const result = await apiCreateRemoteCluster(baseUrl, {
        name: `e2e-remote-${suffix}`,
        display_name: `E2E Remote ${suffix}`,
        default_team_id: teamId,
        password: `e2e-remote-pwd-${suffix}`,
    });
    if (result.error) {
        throw new Error(`apiCreateRemoteCluster failed: ${result.error.message ?? 'unknown error'}`);
    }
};

/**
 * Deletes all remotes then creates exactly one (known name/display_name for e2e taps by text or id).
 * Requires admin session.
 */
export const apiEnsureSingleRemoteCluster = async (
    baseUrl: string,
    teamId: string,
    remote: {name: string; display_name: string; password: string},
): Promise<void> => {
    await apiDeleteAllRemoteClusters(baseUrl);
    await apiPatchConfig(baseUrl, {
        ConnectedWorkspacesSettings: {
            EnableRemoteClusterService: true,
        },
    });
    const result = await apiCreateRemoteCluster(baseUrl, {
        name: remote.name,
        display_name: remote.display_name,
        default_team_id: teamId,
        password: remote.password,
    });
    if (result.error) {
        throw new Error(`apiEnsureSingleRemoteCluster failed: ${result.error.message ?? 'unknown error'}`);
    }
};

/**
 * Check that plugin uploads are enabled, fail if not.
 * @param {string} baseUrl - the base server URL
 * @return {Promise<void>} throws error if plugin uploads are disabled
 */
export const shouldHavePluginUploadEnabled = async (baseUrl: string): Promise<void> => {
    const {config} = await apiGetConfig(baseUrl);
    const isUploadEnabled = config.PluginSettings.EnableUploads;
    if (!isUploadEnabled) {
        throw new Error('Plugin uploads must be enabled for this test to run. Set PluginSettings.EnableUploads=true');
    }
    jestExpect(isUploadEnabled).toEqual(true);
};

/**
 * Ping server status.
 * See https://api.mattermost.com/#operation/GetPing
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {data} on success or {error, status} on error
 */
export const apiPingServerStatus = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/system/ping?get_server_status=true`);
        return {data: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Require server license to successfully continue.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {license} on success or fail when no license
 */
export const apiRequireLicense = async (baseUrl: string): Promise<any> => {
    const {license} = await getClientLicense(baseUrl);

    if (license.IsLicensed !== 'true') {
        console.error('Server has no Enterprise license.');
    }
    jestExpect(license.IsLicensed).toEqual('true');

    return {license};
};

/**
 * Require server license with specific feature to successfully continue.
 * @param {string} baseUrl - the base server URL
 * @param {string} key - feature, e.g. LDAP
 * @return {Object} returns {license} on success or fail when no license or no license to specific feature.
 */
export const apiRequireLicenseForFeature = async (baseUrl: string, key = ''): Promise<any> => {
    const {license} = await getClientLicense(baseUrl);

    if (license.IsLicensed !== 'true') {
        console.error('Server has no Enterprise license.');
    }
    jestExpect(license.IsLicensed).toEqual('true');

    let hasLicenseKey = false;
    for (const [k, v] of Object.entries(license)) {
        if (k === key && v === 'true') {
            hasLicenseKey = true;
            break;
        }
    }

    if (!hasLicenseKey) {
        console.error(`Server has no license for "${key}" feature.`);
    }
    jestExpect(hasLicenseKey).toEqual(true);

    return {license};
};

/**
 * Require SMTP server to be running.
 * @param {string} baseUrl - the base server URL
 */
export const apiRequireSMTPServer = async (baseUrl: string) => {
    const {status} = await apiEmailTest(baseUrl);
    jestExpect(status).toEqual(200);
};

/**
 * Upload server license with file expected at "/detox/e2e/support/fixtures/mattermost-license.txt"
 * See https://api.mattermost.com/#operation/UploadLicenseFile
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUploadLicense = async (baseUrl: string): Promise<any> => {
    const absFilePath = path.resolve(__dirname, '../../support/fixtures/mattermost-license.txt');
    return apiUploadFile('license', absFilePath, {url: `${baseUrl}/api/v4/license`, method: 'POST'});
};

/**
 * Request a trial Enterprise license from the Mattermost license server.
 * See https://api.mattermost.com/#operation/RequestTrialLicense
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiRequestTrialLicense = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/trial-license`, {
            users: 1000,
            terms_accepted: true,
            receive_emails_accepted: true,
            contact_name: 'E2E Test',
            contact_email: 'admin@example.mattermost.com',
            company_name: 'Mattermost E2E',
            company_country: 'US',
            company_size: 'ONE_TO_50',
        });
        return {data: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get client license.
 * If no license, try to upload a license file first, then request a trial license.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {license} on success or the unlicensed state
 */
export const getClientLicense = async (baseUrl: string): Promise<any> => {
    const {license} = await apiGetClientLicense(baseUrl);
    if (license.IsLicensed === 'true') {
        return {license};
    }

    // Try uploading a license file first (e.g. from fixtures)
    const uploadResponse = await apiUploadLicense(baseUrl);
    if (!uploadResponse.error) {
        const out = await apiGetClientLicense(baseUrl);
        if (out.license?.IsLicensed === 'true') {
            console.log('Enterprise license loaded from file.');
            return {license: out.license};
        }
    }

    // Fall back to requesting a trial license from the license server
    console.log('No license file available, requesting trial license...');
    const trialResponse = await apiRequestTrialLicense(baseUrl);
    if (trialResponse.error) {
        console.warn('Failed to request trial license:', trialResponse.error.message || trialResponse.error);
        return {license};
    }
    console.log('Trial Enterprise license activated.');

    // Get the updated license
    const updated = await apiGetClientLicense(baseUrl);
    return {license: updated.license};
};

export const System = {
    apiCheckSystemHealth,
    apiCreateRemoteCluster,
    apiDeleteAllRemoteClusters,
    apiEnsureSingleRemoteCluster,
    apiDeleteRemoteCluster,
    apiEnsureAtLeastOneConfirmedRemoteCluster,
    apiEmailTest,
    apiGetClientConfigOld,
    apiGetClientLicense,
    apiGetConfig,
    apiGetRemoteClusters,
    apiPatchConfig,
    apiPingServerStatus,
    apiRequestTrialLicense,
    apiRequireLicense,
    apiRequireLicenseForFeature,
    apiRequireSMTPServer,
    apiUpdateConfig,
    apiUploadLicense,
    getClientLicense,
    shouldHavePluginUploadEnabled,
};

export default System;
