// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'path';

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

// Demo Plugin Constants
export const DemoPlugin = {
    id: 'com.mattermost.demo-plugin',
    repo: 'mattermost/mattermost-plugin-demo',

    // Get download URL for latest version (linux-amd64 for CI compatibility)
    async getLatestDownloadUrl() {
        const latestVersion = await apiGetLatestPluginVersion(this.repo);

        // return `https://github.com/${this.repo}/releases/download/v${latestVersion}/mattermost-plugin-demo-v${latestVersion}.tar.gz`;
        return `https://github.com/${this.repo}/releases/download/v${latestVersion}/mattermost-plugin-demo-v${latestVersion}-linux-amd64.tar.gz`;
    },
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
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUploadPlugin = async (baseUrl: string, filename: string): Promise<any> => {
    try {
        const absFilePath = path.resolve(__dirname, `../../support/fixtures/${filename}`);
        return await apiUploadFile('plugin', absFilePath, {url: `${baseUrl}/api/v4/plugins`, method: 'POST'});
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
    try {
        const {plugins} = await apiGetAllPlugins(baseUrl);
        if (!plugins) {
            return {isInstalled: false, isActive: false};
        }

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

/**
 * Upload and enable demo plugin, handling various states.
 * Uses DemoPlugin.getLatestDownloadUrl() internally to avoid SSRF concerns.
 * @param {Object} options - configuration object
 * @param {string} options.baseUrl - the base server URL
 * @param {string} options.version - expected plugin version
 * @param {boolean} options.force - whether to force install if already exists
 * @return {Object} returns plugin data on success or {error, status} on error
 */
export const apiUploadAndEnablePlugin = async (options: {
    baseUrl: string;
    version?: string;
    force?: boolean;
}): Promise<any> => {
    const {baseUrl, version, force = false} = options;
    const id = DemoPlugin.id;

    try {
        // Check current plugin status
        const statusResult = await apiGetPluginStatus(baseUrl, id, version);
        if (statusResult.error) {
            return statusResult;
        }

        // If already active with correct version, return early
        if (statusResult.isActive && version && statusResult.isVersionMatch) {
            return {plugin: statusResult.plugin, message: 'Plugin is already active with correct version'};
        }

        // If installed but inactive, try to enable it first (regardless of version)
        if (statusResult.isInstalled && !statusResult.isActive) {
            // eslint-disable-next-line no-console
            console.log(`Found existing plugin version ${statusResult.plugin?.version} (inactive). Attempting to activate it...`);

            const enableResult = await apiEnablePluginById(baseUrl, id);

            // eslint-disable-next-line no-console
            console.log('Enable existing plugin API response:', {
                status: enableResult.status,
                error: enableResult.error,
            });

            if (enableResult.error) {
                // eslint-disable-next-line no-console
                console.log('Failed to activate existing plugin. Will try to install new version.');
            } else {
                // Wait and verify activation
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const verifyStatus = await apiGetPluginStatus(baseUrl, id);

                // eslint-disable-next-line no-console
                console.log('Existing plugin activation verification:', {
                    isActive: verifyStatus.isActive,
                    version: verifyStatus.plugin?.version,
                });

                return {plugin: verifyStatus.plugin, message: 'Plugin was inactive with correct version, now enabled'};
            }
        }

        // Store the existing version before attempting installation
        const existingVersion = statusResult.isInstalled ? statusResult.plugin?.version : null;

        // Plugin needs to be installed - get URL from DemoPlugin
        const url = await DemoPlugin.getLatestDownloadUrl();
        // eslint-disable-next-line no-console
        console.log(`Attempting to install plugin from: ${url}`);

        const installResult = await apiInstallPluginFromUrl(baseUrl, url, force);

        if (installResult.error) {
            // eslint-disable-next-line no-console
            console.log('Plugin installation failed:', {
                error: installResult.error,
                status: installResult.status,
            });

            // Check if there's an existing plugin we can try to activate as fallback
            const fallbackStatusCheck = await apiGetPluginStatus(baseUrl, id);
            if (fallbackStatusCheck.isInstalled) {
                // eslint-disable-next-line no-console
                console.log(`Installation failed, but found existing plugin version ${fallbackStatusCheck.plugin?.version}. Attempting to activate it as fallback...`);

                const fallbackEnableResult = await apiEnablePluginById(baseUrl, id);

                // eslint-disable-next-line no-console
                console.log('Fallback enable plugin API response:', {
                    status: fallbackEnableResult.status,
                    statusText: fallbackEnableResult.statusText,
                    data: fallbackEnableResult.data,
                    error: fallbackEnableResult.error,
                });

                if (fallbackEnableResult.error) {
                    // eslint-disable-next-line no-console
                    console.log('Fallback activation also failed. Returning original installation error.');
                    return {
                        error: installResult.error,
                        status: installResult.status,
                        message: `Plugin installation failed (HTTP ${installResult.status}) and fallback activation also failed`,
                    };
                }

                // Wait for activation
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Verify fallback activation worked
                const fallbackVerifyStatus = await apiGetPluginStatus(baseUrl, id);
                // eslint-disable-next-line no-console
                console.log('Fallback activation verification:', {
                    isInstalled: fallbackVerifyStatus.isInstalled,
                    isActive: fallbackVerifyStatus.isActive,
                    version: fallbackVerifyStatus.plugin?.version,
                });

                if (fallbackVerifyStatus.isActive) {
                    return {
                        plugin: fallbackVerifyStatus.plugin,
                        message: `Installation failed but activated existing plugin version ${fallbackVerifyStatus.plugin?.version} as fallback`,
                    };
                }

                // eslint-disable-next-line no-console
                console.log('Fallback activation succeeded but plugin is not active. Returning error.');
                return {
                    error: installResult.error,
                    status: installResult.status,
                    message: `Plugin installation failed (HTTP ${installResult.status}), fallback activation attempted but plugin not active`,
                };
            }

            // No existing plugin to fall back to
            // eslint-disable-next-line no-console
            console.log('Installation failed and no existing plugin found for fallback.');
            return installResult;
        }

        // eslint-disable-next-line no-console
        console.log('Plugin installation succeeded');

        // Wait a moment for installation to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Enable the newly installed plugin
        // eslint-disable-next-line no-console
        console.log('Attempting to enable newly installed plugin...');
        const enableResult = await apiEnablePluginById(baseUrl, id);

        // Log the enable API response for debugging
        // eslint-disable-next-line no-console
        console.log('Enable plugin API response:', {
            status: enableResult.status,
            statusText: enableResult.statusText,
            data: enableResult.data,
            error: enableResult.error,
        });

        if (enableResult.error) {
            // eslint-disable-next-line no-console
            console.log(`Enable failed with HTTP ${enableResult.status}. Checking if plugin is actually active...`);

            // Check if plugin is actually active despite the error
            const verifyStatusAfterError = await apiGetPluginStatus(baseUrl, id);
            // eslint-disable-next-line no-console
            console.log('Plugin status after enable error:', {
                isInstalled: verifyStatusAfterError.isInstalled,
                isActive: verifyStatusAfterError.isActive,
                version: verifyStatusAfterError.plugin?.version,
            });

            if (verifyStatusAfterError.isActive) {
                // eslint-disable-next-line no-console
                console.log('Plugin is actually active despite enable error. Treating as success.');
                return {
                    plugin: verifyStatusAfterError.plugin,
                    message: `Plugin enabled successfully (despite HTTP ${enableResult.status} timeout)`,
                };
            }

            // Return error with consistent format
            return {
                error: enableResult.error,
                status: enableResult.status,
                message: `Failed to enable plugin: HTTP ${enableResult.status}`,
            };
        }

        // Wait a moment for enablement to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check plugin status immediately after enable to verify it activated
        const enableStatusCheck = await apiGetPluginStatus(baseUrl, id);
        // eslint-disable-next-line no-console
        console.log('Plugin status immediately after enable:', {
            isInstalled: enableStatusCheck.isInstalled,
            isActive: enableStatusCheck.isActive,
            version: enableStatusCheck.plugin?.version,
        });

        const message = existingVersion? `Installed version ${enableStatusCheck.plugin?.version || 'unknown'} over existing version ${existingVersion}`: 'Plugin uploaded and enabled successfully';

        return {
            plugin: enableStatusCheck.plugin,
            message,
        };
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Plugin = {
    apiDisableNonPrepackagedPlugins,
    apiDisablePluginById,
    apiEnablePluginById,
    apiGetAllPlugins,
    apiGetLatestPluginVersion,
    apiGetPluginStatus,
    apiInstallPluginFromUrl,
    apiRemovePluginById,
    apiUploadPlugin,
    apiUploadAndEnablePlugin,
};

export default Plugin;
