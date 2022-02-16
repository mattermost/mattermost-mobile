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

const prepackagedPlugins = [
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
    'com.mattermost.nps',
    'com.mattermost.welcomebot',
    'zoom',
];

/**
 * Disable non-prepackaged plugins.
 */
export const apiDisableNonPrepackagedPlugins = async () => {
    const {plugins} = await apiGetAllPlugins();
    if (!plugins) {
        return;
    }
    plugins.active.forEach(async (plugin) => {
        if (!prepackagedPlugins.includes(plugin.id)) {
            await apiDisablePluginById(plugin.id);
        }
    });
};

/**
 * Disable plugin.
 * See https://api.mattermost.com/#operation/DisablePlugin
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiDisablePluginById = async (pluginId) => {
    try {
        return await client.post(`/api/v4/plugins/${encodeURIComponent(pluginId)}/disable`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Enable plugin.
 * See https://api.mattermost.com/#operation/EnablePlugin
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiEnablePluginById = async (pluginId) => {
    try {
        return await client.post(`/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get plugins.
 * See https://api.mattermost.com/#operation/GetPlugins
 * @return {Object} returns {plugins} on success or {error, status} on error
 */
export const apiGetAllPlugins = async () => {
    try {
        const response = await client.get('/api/v4/plugins');

        return {plugins: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Install plugin from URL.
 * See https://api.mattermost.com/#operation/InstallPluginFromUrl
 * @param {string} pluginDownloadUrl - URL used to download the plugin
 * @param {string} force - Set to 'true' to overwrite a previously installed plugin with the same ID, if any
 * @return {Object} returns {plugin} on success or {error, status} on error
 */
export const apiInstallPluginFromUrl = async (pluginDownloadUrl, force = false) => {
    try {
        const response = await client.post(`/api/v4/plugins/install_from_url?plugin_download_url=${encodeURIComponent(pluginDownloadUrl)}&force=${force}`);

        return {plugin: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Remove plugin.
 * See https://api.mattermost.com/#operation/RemovePlugin
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiRemovePluginById = async (pluginId) => {
    try {
        return await client.delete(`/api/v4/plugins/${encodeURIComponent(pluginId)}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Upload plugin.
 * See https://api.mattermost.com/#operation/UploadPlugin
 * @param {string} filename - the filename of plugin to be uploaded
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUploadPlugin = async (filename) => {
    try {
        const absFilePath = path.resolve(__dirname, `../../support/fixtures/${filename}`);
        return await apiUploadFile('plugin', absFilePath, {url: '/api/v4/plugins', method: 'POST'});
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Plugin = {
    apiDisableNonPrepackagedPlugins,
    apiDisablePluginById,
    apiEnablePluginById,
    apiGetAllPlugins,
    apiInstallPluginFromUrl,
    apiRemovePluginById,
    apiUploadPlugin,
};

export default Plugin;
