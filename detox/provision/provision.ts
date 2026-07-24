// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_PLUGIN_ID, DEMO_PLUGIN_ID, REQUIRED_PLUGINS} from './constants';
import {ensureCustomProfileAttributeFields} from './custom-profile-attributes';
import {createMattermostClient, login} from './http-client';
import {ensureTrialLicense} from './license';
import {logInfo, logWarn} from './log';
import {ensureAgentsPlugin, ensureDemoPluginReady, installRequiredPlugin} from './plugins';
import {configureTestServer, ensureChannelBookmarksEnabled, ensureCustomProfileAttributesEnabled, getServerMmVersion} from './server-config';

import type {MattermostClient, ProvisionCredentials} from './types';

type AgentsStatusResponse = {available?: boolean};

async function verifyAgentsSetup(client: MattermostClient, token: string): Promise<boolean> {
    const statusRes = await client.request<AgentsStatusResponse>('GET', '/api/v4/agents/status', undefined, token);
    if (statusRes.data?.available === true) {
        return true;
    }

    logWarn('Agents not available — agents tests may be skipped.');
    return false;
}

export async function provisionServer(serverUrl: string, credentials: ProvisionCredentials): Promise<void> {
    const client = createMattermostClient(serverUrl);
    const token = await login(client, credentials);
    const serverMmVersion = await getServerMmVersion(client, token);
    logInfo(`Mattermost server version: ${serverMmVersion}`);

    await ensureTrialLicense(client, token);
    await configureTestServer(client, token);

    await ensureAgentsPlugin(client, token);

    /* eslint-disable no-await-in-loop -- install required plugins one at a time for clear provisioning logs */
    for (const plugin of REQUIRED_PLUGINS) {
        if (plugin.id === AGENTS_PLUGIN_ID) {
            continue;
        }
        await installRequiredPlugin(client, token, plugin);
        if (plugin.id === DEMO_PLUGIN_ID) {
            await ensureDemoPluginReady(client, token);
        }
    }
    /* eslint-enable no-await-in-loop */

    const agentsOk = await verifyAgentsSetup(client, token);
    if (!agentsOk) {
        logWarn('Agents E2E setup verification failed — agents tests may be skipped.');
    }

    // Plugin installs can reload config and reset feature flags — re-apply after all setup.
    if (!await ensureCustomProfileAttributesEnabled(client, token)) {
        logWarn('Custom profile attributes feature flag not enabled after provisioning; CPA tests remain skipped on Spinwick.');
    }
    if (!await ensureChannelBookmarksEnabled(client, token)) {
        logWarn('Channel bookmarks feature flag not enabled after provisioning.');
    }
    if (!await ensureCustomProfileAttributeFields(client, token)) {
        logWarn('Custom profile attribute setup incomplete.');
    }

    logInfo('Server provisioning complete.');
}
