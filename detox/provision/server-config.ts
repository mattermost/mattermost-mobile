// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_MAX_FILE_SIZE_BYTES} from '@support/constants/file_settings';

import {DEMO_PLUGIN_ID} from './constants';
import {sleep} from './http-client';
import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

type ApiErrorBody = {message?: string};

const CONFIG_PATCH_MAX_ATTEMPTS = 3;
const CONFIG_PATCH_RETRY_BASE_DELAY_MS = 2_000;

const TEST_SERVER_CONFIG_PATCH = {
    PluginSettings: {
        EnableUploads: true,
        EnableMarketplace: true,
        EnableRemoteMarketplace: true,
        Plugins: {
            'com.mattermost.calls': {
                DefaultEnabled: true,
            },
            [DEMO_PLUGIN_ID]: {
                DialogOnlyMode: true,
            },
        },
        PluginStates: {
            [DEMO_PLUGIN_ID]: {
                Enable: true,
            },
        },
    },
    RateLimitSettings: {
        Enable: false,
    },
    FileSettings: {
        MaxFileSize: DEFAULT_MAX_FILE_SIZE_BYTES,
    },
    ServiceSettings: {
        MaximumActiveUsers: 999999,
        MaximumLoginAttempts: 999999,
        EnableBotAccountCreation: true,
        EnableChannelBookmarks: true,
    },
    SupportSettings: {
        ReportAProblemType: 'default',
        AllowDownloadLogs: true,
        HelpLink: 'https://docs.mattermost.com/',
    },
    PasswordSettings: {
        MinimumLength: 8,
    },
    TeamSettings: {
        MaxUsersPerTeam: 999999,
        ExperimentalViewArchivedChannels: true,
    },
    ConnectedWorkspacesSettings: {
        EnableSharedChannels: true,
        EnableRemoteClusterService: true,
    },
    ExperimentalSettings: {
        EnableSharedChannels: true,
        EnableRemoteClusterService: true,
        RestrictSystemAdmin: false,
    },
    FeatureFlags: {
        CustomProfileAttributes: true,
        ChannelBookmarks: true,
        InteractiveDialogAppsForm: true,
    },
};

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

    logWarn(
        'FeatureFlagCustomProfileAttributes not true after config update. ' +
        'Cloud Spinwick installations require MM_FEATUREFLAGS_CUSTOMPROFILEATTRIBUTES=true in Matterwick PriorityEnv.',
    );
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

async function patchTestServerConfig(client: MattermostClient, token: string) {
    /* eslint-disable no-await-in-loop -- retry an idempotent config patch after transient cloud failures */
    for (let attempt = 1; attempt <= CONFIG_PATCH_MAX_ATTEMPTS; attempt++) {
        try {
            const response = await client.request<ApiErrorBody>(
                'PUT',
                '/api/v4/config/patch',
                TEST_SERVER_CONFIG_PATCH,
                token,
            );
            if (response.status < 500 || attempt === CONFIG_PATCH_MAX_ATTEMPTS) {
                return response;
            }

            logWarn(`Config patch returned HTTP ${response.status}; retrying (${attempt}/${CONFIG_PATCH_MAX_ATTEMPTS})...`);
        } catch (error) {
            if (attempt === CONFIG_PATCH_MAX_ATTEMPTS) {
                throw error;
            }

            logWarn(`Config patch request failed; retrying (${attempt}/${CONFIG_PATCH_MAX_ATTEMPTS})...`);
        }

        await sleep(CONFIG_PATCH_RETRY_BASE_DELAY_MS * attempt);
    }
    /* eslint-enable no-await-in-loop */

    throw new Error('Config patch retries exhausted.');
}

export async function configureTestServer(client: MattermostClient, token: string): Promise<void> {
    logInfo('Updating plugin uploads, Marketplace, disabling rate limiting, and removing user caps...');
    const updateRes = await patchTestServerConfig(client, token);
    if (updateRes.status >= 400) {
        throw new Error(`Config patch failed (HTTP ${updateRes.status}): ${updateRes.data?.message ?? 'unknown error'}`);
    }

    await ensureCustomProfileAttributesEnabled(client, token);
    await ensureChannelBookmarksEnabled(client, token);
}
