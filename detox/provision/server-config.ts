// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_MAX_FILE_SIZE_BYTES} from '@support/constants/file_settings';

import {DEMO_PLUGIN_ID} from './constants';
import {sleep} from './http-client';
import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

type ApiErrorBody = {message?: string};

type ServerConfig = Record<string, unknown>;

type ClientConfigOld = {
    FeatureFlagCustomProfileAttributes?: string;
    FeatureFlagChannelBookmarks?: string;
};

export async function ensureCustomProfileAttributesEnabled(
    client: MattermostClient,
    token: string,
): Promise<boolean> {
    const patchRes = await client.request<ApiErrorBody>(
        'PUT',
        '/api/v4/config/patch',
        {FeatureFlags: {CustomProfileAttributes: true}},
        token,
    );
    if (patchRes.status >= 400) {
        logWarn(
            `ensureCustomProfileAttributesEnabled failed (HTTP ${patchRes.status}): ${patchRes.data?.message ?? 'unknown error'}`,
        );
        return false;
    }

    return waitForCustomProfileAttributesClientFlag(client, token);
}

async function waitForCustomProfileAttributesClientFlag(
    client: MattermostClient,
    token: string,
    {maxAttempts = 30, intervalMs = 1000} = {},
): Promise<boolean> {
    /* eslint-disable no-await-in-loop -- poll until client flag propagates */
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await client.request<ClientConfigOld>(
            'GET',
            '/api/v4/config/client?format=old',
            undefined,
            token,
        );
        if (res.data?.FeatureFlagCustomProfileAttributes === 'true') {
            logInfo('CustomProfileAttributes enabled in client config.');
            return true;
        }

        if (attempt === 0) {
            logInfo('Waiting for CustomProfileAttributes client flag...');
        }

        await sleep(intervalMs);
    }
    /* eslint-enable no-await-in-loop */

    logWarn('FeatureFlagCustomProfileAttributes not true after config update — user_attributes E2E may fail.');
    return false;
}

export async function ensureChannelBookmarksEnabled(
    client: MattermostClient,
    token: string,
): Promise<boolean> {
    const patchRes = await client.request<ApiErrorBody>(
        'PUT',
        '/api/v4/config/patch',
        {FeatureFlags: {ChannelBookmarks: true}},
        token,
    );
    if (patchRes.status >= 400) {
        logWarn(
            `ensureChannelBookmarksEnabled failed (HTTP ${patchRes.status}): ${patchRes.data?.message ?? 'unknown error'}`,
        );
        return false;
    }

    return waitForChannelBookmarksClientFlag(client, token);
}

async function waitForChannelBookmarksClientFlag(
    client: MattermostClient,
    token: string,
    {maxAttempts = 30, intervalMs = 1000} = {},
): Promise<boolean> {
    /* eslint-disable no-await-in-loop -- poll until client flag propagates */
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await client.request<ClientConfigOld>(
            'GET',
            '/api/v4/config/client?format=old',
            undefined,
            token,
        );
        if (res.data?.FeatureFlagChannelBookmarks === 'true') {
            logInfo('ChannelBookmarks enabled in client config.');
            return true;
        }

        if (attempt === 0) {
            logInfo('Waiting for ChannelBookmarks client flag...');
        }

        await sleep(intervalMs);
    }
    /* eslint-enable no-await-in-loop */

    logWarn('FeatureFlagChannelBookmarks not true after config update — bookmark E2E may fail.');
    return false;
}

export async function getServerMmVersion(client: MattermostClient, token: string): Promise<string> {
    const res = await client.request<{Version?: string; version?: string}>('GET', '/api/v4/config/client?format=old', undefined, token);
    if (res.status >= 400) {
        logWarn('Could not read server version — assuming 0.0.0.');
        return '0.0.0';
    }

    return res.data?.Version || res.data?.version || '0.0.0';
}

export async function configureTestServer(client: MattermostClient, token: string): Promise<void> {
    const configRes = await client.request<ServerConfig>('GET', '/api/v4/config', undefined, token);
    if (configRes.status >= 400) {
        logWarn('Could not read server config.');
        return;
    }

    const config = configRes.data;

    config.PluginSettings = config.PluginSettings || {};
    const pluginSettings = config.PluginSettings as Record<string, unknown>;
    pluginSettings.EnableUploads = true;
    pluginSettings.EnableMarketplace = true;
    pluginSettings.EnableRemoteMarketplace = true;

    config.RateLimitSettings = config.RateLimitSettings || {};
    (config.RateLimitSettings as Record<string, unknown>).Enable = false;

    config.FileSettings = config.FileSettings || {};
    (config.FileSettings as Record<string, unknown>).MaxFileSize = DEFAULT_MAX_FILE_SIZE_BYTES;

    config.ServiceSettings = config.ServiceSettings || {};
    const serviceSettings = config.ServiceSettings as Record<string, unknown>;
    serviceSettings.MaximumActiveUsers = 999999;
    serviceSettings.MaximumLoginAttempts = 999999;
    serviceSettings.EnableBotAccountCreation = true;
    serviceSettings.EnableChannelBookmarks = true;

    config.SupportSettings = config.SupportSettings || {};
    const supportSettings = config.SupportSettings as Record<string, unknown>;
    supportSettings.ReportAProblemType = 'default';
    supportSettings.AllowDownloadLogs = true;
    supportSettings.HelpLink = 'https://docs.mattermost.com/';

    config.PasswordSettings = config.PasswordSettings || {};
    (config.PasswordSettings as Record<string, unknown>).MinimumLength = 8;

    config.TeamSettings = config.TeamSettings || {};
    const teamSettings = config.TeamSettings as Record<string, unknown>;
    teamSettings.MaxUsersPerTeam = 999999;
    teamSettings.ExperimentalViewArchivedChannels = true;

    config.ConnectedWorkspacesSettings = config.ConnectedWorkspacesSettings || {};
    const connectedWorkspaces = config.ConnectedWorkspacesSettings as Record<string, unknown>;
    connectedWorkspaces.EnableSharedChannels = true;
    connectedWorkspaces.EnableRemoteClusterService = true;

    config.ExperimentalSettings = config.ExperimentalSettings || {};
    const experimentalSettings = config.ExperimentalSettings as Record<string, unknown>;
    experimentalSettings.EnableSharedChannels = true;
    experimentalSettings.EnableRemoteClusterService = true;
    experimentalSettings.RestrictSystemAdmin = false;

    config.FeatureFlags = config.FeatureFlags || {};
    const featureFlags = config.FeatureFlags as Record<string, unknown>;
    featureFlags.CustomProfileAttributes = true;
    featureFlags.ChannelBookmarks = true;
    featureFlags.InteractiveDialogAppsForm = true;

    pluginSettings.Plugins = pluginSettings.Plugins || {};
    const plugins = pluginSettings.Plugins as Record<string, Record<string, unknown>>;
    plugins['com.mattermost.calls'] = {
        ...(plugins['com.mattermost.calls'] || {}),
        DefaultEnabled: true,
    };
    plugins[DEMO_PLUGIN_ID] = {
        ...(plugins[DEMO_PLUGIN_ID] || {}),
        DialogOnlyMode: true,
    };

    pluginSettings.PluginStates = pluginSettings.PluginStates || {};
    const pluginStates = pluginSettings.PluginStates as Record<string, Record<string, unknown>>;
    pluginStates[DEMO_PLUGIN_ID] = {
        ...(pluginStates[DEMO_PLUGIN_ID] || {}),
        Enable: true,
    };

    logInfo('Updating plugin uploads, Marketplace, disabling rate limiting, and removing user caps...');
    const updateRes = await client.request<ApiErrorBody>('PUT', '/api/v4/config', config, token);
    if (updateRes.status >= 400) {
        logWarn(`Config update failed (HTTP ${updateRes.status}): ${updateRes.data?.message ?? JSON.stringify(updateRes.data)}`);
        return;
    }

    await ensureCustomProfileAttributesEnabled(client, token);
    await ensureChannelBookmarksEnabled(client, token);
}
