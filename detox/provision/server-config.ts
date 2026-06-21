// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

type ApiErrorBody = {message?: string};

type ServerConfig = Record<string, unknown>;

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

    config.FeatureFlags = config.FeatureFlags || {};
    (config.FeatureFlags as Record<string, unknown>).CustomProfileAttributes = true;

    pluginSettings.Plugins = pluginSettings.Plugins || {};
    const plugins = pluginSettings.Plugins as Record<string, Record<string, unknown>>;
    plugins['com.mattermost.calls'] = {
        ...(plugins['com.mattermost.calls'] || {}),
        DefaultEnabled: true,
    };

    logInfo('Updating plugin uploads, Marketplace, disabling rate limiting, and removing user caps...');
    const updateRes = await client.request<ApiErrorBody>('PUT', '/api/v4/config', config, token);
    if (updateRes.status >= 400) {
        logWarn(`Config update failed (HTTP ${updateRes.status}): ${updateRes.data.message || JSON.stringify(updateRes.data)}`);
    }
}
