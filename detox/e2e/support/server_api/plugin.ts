// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'path';

import {
    DEMO_PLUGIN_FIXTURE_FILENAME,
    DEMO_PLUGIN_ID,
    demoPluginInstallPlan,
    ensureDemoPluginFixture,
} from '../../../shared/demo-plugin-fixture';

import client from './client';
import {apiUploadFile, getResponseFromError} from './common';

// ****************************************************************
// Plugins
// https://api.mattermost.com/#tag/plugins
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

const prepackagedPlugins = new Set([
    'antivirus',
    'mattermost-autolink',
    'com.mattermost.aws-sns',
    'com.mattermost.plugin-channel-export',
    'com.mattermost.custom-attributes',
    'github',
    'com.github.manland.mattermost-plugin-gitlab',
    'com.mattermost.plugin-incident-management',
    'jenkins',
    'jira',
    'com.mattermost.calls',
    'com.mattermost.nps',
    'com.mattermost.welcomebot',
    'zoom',
]);

/**
 * Get the latest release version from GitHub releases
 * @param {string} repo - GitHub repository in format 'owner/repo'
 * @return {Promise<string>} returns latest version string without 'v' prefix
 */
export const apiGetLatestPluginVersion = async (repo: string): Promise<string> => {
    try {
        const response = await client.get(`https://api.github.com/repos/${repo}/releases/latest`);
        const tagName = response.data.tag_name;

        // Remove 'v' prefix if present (e.g., 'v0.10.2' -> '0.10.2')
        return tagName.startsWith('v') ? tagName.substring(1) : tagName;
    } catch (err) {
        // Fallback to hardcoded version if API fails
        return '0.10.3';
    }
};

// Agents Plugin Constants
export const AgentsPlugin = {
    id: 'mattermost-ai',
} as const;

// Calls Plugin Constants
export const CallsPlugin = {
    id: 'com.mattermost.calls',
    url: 'https://github.com/mattermost/mattermost-plugin-calls/releases/download/v1.5.0/com.mattermost.calls-1.5.0.tar.gz',
} as const;

// Demo Plugin Constants
export const DemoPlugin = {
    id: DEMO_PLUGIN_ID,
    filename: DEMO_PLUGIN_FIXTURE_FILENAME,
} as const;

/**
 * Disable non-prepackaged plugins.
 * @param {string} baseUrl - the base server URL
 */
export const apiDisableNonPrepackagedPlugins = async (baseUrl: string): Promise<any> => {
    const {plugins} = await apiGetAllPlugins(baseUrl);
    if (!plugins) {
        return;
    }
    plugins.active.forEach(async (plugin: any) => {
        if (plugin.id !== DemoPlugin.id && !prepackagedPlugins.has(plugin.id)) {
            await apiDisablePluginById(baseUrl, plugin.id);
        }
    });
};

/**
 * Disable plugin.
 * See https://api.mattermost.com/#operation/DisablePlugin
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiDisablePluginById = async (baseUrl: string, pluginId: string): Promise<any> => {
    try {
        return await client.post(`${baseUrl}/api/v4/plugins/${encodeURIComponent(pluginId)}/disable`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Enable plugin.
 * See https://api.mattermost.com/#operation/EnablePlugin
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiEnablePluginById = async (baseUrl: string, pluginId: string): Promise<any> => {
    try {
        return await client.post(`${baseUrl}/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get plugins.
 * See https://api.mattermost.com/#operation/GetPlugins
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {plugins} on success or {error, status} on error
 */
export const apiGetAllPlugins = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/plugins`);

        return {plugins: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Install plugin from URL.
 * See https://api.mattermost.com/#operation/InstallPluginFromUrl
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginDownloadUrl - URL used to download the plugin
 * @param {string} force - Set to 'true' to overwrite a previously installed plugin with the same ID, if any
 * @return {Object} returns {plugin} on success or {error, status} on error
 */
export const apiInstallPluginFromUrl = async (baseUrl: string, pluginDownloadUrl: string, force = false): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/plugins/install_from_url?plugin_download_url=${encodeURIComponent(pluginDownloadUrl)}&force=${force}`);

        return {plugin: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Remove plugin.
 * See https://api.mattermost.com/#operation/RemovePlugin
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiRemovePluginById = async (baseUrl: string, pluginId: string): Promise<any> => {
    try {
        return await client.delete(`${baseUrl}/api/v4/plugins/${encodeURIComponent(pluginId)}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Upload plugin.
 * See https://api.mattermost.com/#operation/UploadPlugin
 * @param {string} baseUrl - the base server URL
 * @param {string} filename - the filename of plugin to be uploaded
 * @param {boolean} force - overwrite an existing plugin install
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUploadPlugin = async (baseUrl: string, filename: string, force = false): Promise<any> => {
    try {
        const absFilePath = path.resolve(__dirname, `../../support/fixtures/${filename}`);
        const forceQuery = force ? '?force=true' : '';
        return await apiUploadFile('plugin', absFilePath, {url: `${baseUrl}/api/v4/plugins${forceQuery}`, method: 'POST'});
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get plugin status - whether it's installed and/or active.
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID
 * @param {string} version - the expected plugin version
 * @return {Object} returns {isInstalled, isActive, plugin} on success or {error, status} on error
 */
export const apiGetPluginStatus = async (baseUrl: string, pluginId: string, version?: string): Promise<any> => {
    const allPluginsResult = await apiGetAllPlugins(baseUrl);
    if (allPluginsResult.error) {
        return allPluginsResult;
    }

    const {plugins} = allPluginsResult;
    if (!plugins) {
        return {isInstalled: false, isActive: false};
    }

    try {
        // Check if plugin is installed (in either active or inactive list)
        let plugin = plugins.active?.find((p: any) => p.id === pluginId);
        if (plugin) {
            const isVersionMatch = !version || plugin.version === version;
            return {
                isInstalled: true,
                isActive: true,
                plugin,
                isVersionMatch,
            };
        }

        plugin = plugins.inactive?.find((p: any) => p.id === pluginId);
        if (plugin) {
            const isVersionMatch = !version || plugin.version === version;
            return {
                isInstalled: true,
                isActive: false,
                plugin,
                isVersionMatch,
            };
        }

        return {isInstalled: false, isActive: false};
    } catch (err) {
        return getResponseFromError(err);
    }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ensure the demo plugin is active without asking the Mattermost origin to
 * download GitHub (install_from_url 524s behind Cloudflare and wedges the shard).
 * Prefer: already active → enable inactive → multipart-upload the runner fixture.
 */
export const apiUploadAndEnablePlugin = async (options: {
    baseUrl: string;
    version?: string;
    force?: boolean;
    filename?: string;
}): Promise<any> => {
    const {baseUrl, version, filename = DEMO_PLUGIN_FIXTURE_FILENAME} = options;
    const id = DemoPlugin.id;

    const statusResult = await apiGetPluginStatus(baseUrl, id, version);
    if (statusResult.error) {
        return statusResult;
    }

    const plan = demoPluginInstallPlan(statusResult);
    if (plan === 'noop') {
        return {plugin: statusResult.plugin, message: 'Demo plugin already active'};
    }

    if (plan === 'enable') {
        const enableResult = await apiEnablePluginById(baseUrl, id);
        if (enableResult.error) {
            return enableResult;
        }
        await sleep(2000);
        return apiGetPluginStatus(baseUrl, id, version);
    }

    try {
        await ensureDemoPluginFixture();
    } catch (err) {
        return {
            error: {message: err instanceof Error ? err.message : String(err)},
            status: 0,
        };
    }

    const uploadResult = await apiUploadPlugin(baseUrl, filename, true);
    if (uploadResult.error) {
        return uploadResult;
    }
    await sleep(1000);

    const enableResult = await apiEnablePluginById(baseUrl, id);
    if (enableResult.error) {
        const afterError = await apiGetPluginStatus(baseUrl, id, version);
        if (afterError.isActive) {
            return {plugin: afterError.plugin, message: 'Demo plugin uploaded; enable timed out but plugin is active'};
        }
        return enableResult;
    }
    await sleep(1000);
    return apiGetPluginStatus(baseUrl, id, version);
};

/**
 * Install a plugin from the Marketplace.
 * See https://api.mattermost.com/#operation/InstallMarketplacePlugin
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID to install from Marketplace
 * @return {Object} returns {plugin} on success or {error, status} on error
 */
export const apiInstallPluginFromMarketplace = async (baseUrl: string, pluginId: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/plugins/marketplace`, {id: pluginId});
        return {plugin: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Ensure a plugin is installed and active, installing from Marketplace if needed.
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns {isInstalled, isActive} status
 */
export const apiEnsurePluginInstalled = async (baseUrl: string, pluginId: string): Promise<any> => {
    // Check if already installed
    const status = await apiGetPluginStatus(baseUrl, pluginId);
    if (status.isActive) {
        return status;
    }

    if (status.isInstalled && !status.isActive) {
        // eslint-disable-next-line no-console
        console.log(`[apiEnsurePluginInstalled] Plugin ${pluginId} installed but inactive, enabling...`);
        await apiEnablePluginById(baseUrl, pluginId);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return apiGetPluginStatus(baseUrl, pluginId);
    }

    // Not installed — try Marketplace
    // eslint-disable-next-line no-console
    console.log(`[apiEnsurePluginInstalled] Plugin ${pluginId} not installed, installing from Marketplace...`);
    const installResult = await apiInstallPluginFromMarketplace(baseUrl, pluginId);
    if (installResult.error) {
        // eslint-disable-next-line no-console
        console.warn(`[apiEnsurePluginInstalled] Marketplace install failed for ${pluginId}:`, installResult.error.message || installResult.error);
        return {isInstalled: false, isActive: false};
    }

    // Enable after install
    await apiEnablePluginById(baseUrl, pluginId);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const finalStatus = await apiGetPluginStatus(baseUrl, pluginId);
    // eslint-disable-next-line no-console
    console.log(`[apiEnsurePluginInstalled] Plugin ${pluginId}: installed=${finalStatus.isInstalled}, active=${finalStatus.isActive}`);
    return finalStatus;
};

export const Plugin = {
    apiDisableNonPrepackagedPlugins,
    apiDisablePluginById,
    apiEnablePluginById,
    apiEnsurePluginInstalled,
    apiGetAllPlugins,
    apiGetLatestPluginVersion,
    apiGetPluginStatus,
    apiInstallPluginFromMarketplace,
    apiInstallPluginFromUrl,
    apiRemovePluginById,
    apiUploadPlugin,
    apiUploadAndEnablePlugin,
};

export default Plugin;
