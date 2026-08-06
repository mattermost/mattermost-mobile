// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_MAX_FILE_SIZE_BYTES} from '@support/constants/file_settings';

import {DEMO_PLUGIN_ID} from './constants';
import {sleep} from './http-client';
import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

type ApiErrorBody = {message?: string};

const CONFIG_PATCH_MAX_ATTEMPTS = 5;
const CONFIG_PATCH_RETRY_BASE_DELAY_MS = 5_000;

const TEST_SERVER_CONFIG_PATCH = {
    PluginSettings: {
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
    FileSettings: {
        MaxFileSize: DEFAULT_MAX_FILE_SIZE_BYTES,
    },
    SupportSettings: {
        AllowDownloadLogs: true,
    },
    TeamSettings: {
        ExperimentalViewArchivedChannels: true,
    },
    // Suite-wide defaults for shared Matterwick hosts. Banner UI still requires
    // property-field setup (cleaned per classification suite), so leaving the
    // feature flag on does not affect unrelated specs. Runtime toggles that
    // need off use the classification lock.
    FeatureFlags: {
        ClassificationMarkings: true,
    },
    ServiceSettings: {
        EnableCrossTeamSearch: true,
        CollapsedThreads: 'always_on',
    },
    ConnectedWorkspacesSettings: {
        EnableSharedChannels: true,
        EnableRemoteClusterService: true,
    },
    ExperimentalSettings: {
        EnableSharedChannels: true,
        EnableRemoteClusterService: true,
    },
};

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

            const detail = error instanceof Error ? error.message : String(error);
            logWarn(`patchTestServerConfig: request failed (${detail}); retrying (${attempt}/${CONFIG_PATCH_MAX_ATTEMPTS})...`);
        }

        await sleep(CONFIG_PATCH_RETRY_BASE_DELAY_MS * attempt);
    }
    /* eslint-enable no-await-in-loop */

    throw new Error('Config patch retries exhausted.');
}

export async function configureTestServer(client: MattermostClient, token: string): Promise<void> {
    logInfo('Updating suite-mutable server and plugin settings...');
    const updateRes = await patchTestServerConfig(client, token);
    if (updateRes.status >= 400) {
        throw new Error(`Config patch failed (HTTP ${updateRes.status}): ${updateRes.data?.message ?? 'unknown error'}`);
    }
}
