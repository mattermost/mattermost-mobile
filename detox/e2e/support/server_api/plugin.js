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

/**
 * Get plugins.
 * See https://api.mattermost.com/#tag/plugins/paths/~1plugins/get
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
 * Upload plugin.
 * See https://api.mattermost.com/#tag/plugins/paths/~1plugins/post
 * @param {string} filename - the filename of plugin to be uploaded
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUploadPlugin = async (filename) => {
    try {
        const absFilePath = path.resolve(__dirname, `../../support/fixtures/${filename}`);
        const response = await apiUploadFile('plugin', absFilePath, {url: '/api/v4/plugins', method: 'POST'});

        return response;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Install plugin from URL.
 * See https://api.mattermost.com/#tag/plugins/paths/~1plugins~1install_from_url/post
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
 * Enable plugin.
 * See https://api.mattermost.com/#tag/plugins/paths/~1plugins~1{plugin_id}~1enable/post
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiEnablePluginById = async (pluginId) => {
    try {
        const response = await client.post(`/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`);

        return response;
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Disable plugin.
 * See https://api.mattermost.com/#tag/plugins/paths/~1plugins~1{plugin_id}~1disable/post
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiDisablePluginById = async (pluginId) => {
    try {
        const response = await client.post(`/api/v4/plugins/${encodeURIComponent(pluginId)}/disable`);

        return response;
    } catch (err) {
        return getResponseFromError(err);
    }
};

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
    plugins.active.forEach(async (plugin) => {
        if (!prepackagedPlugins.includes(plugin.id)) {
            await apiDisablePluginById(plugin.id);
        }
    });
};

/**
 * Remove plugin.
 * See https://api.mattermost.com/#tag/plugins/paths/~1plugins~1{plugin_id}/delete
 * @param {string} pluginId - the plugin ID
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiRemovePluginById = async (pluginId) => {
    try {
        const response = await client.delete(`/api/v4/plugins/${encodeURIComponent(pluginId)}`);

        return response;
    } catch (err) {
        return getResponseFromError(err);
    }
};
