// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ensureAgentsE2EBot, verifyAgentsSetup} from './agents';
import {AGENTS_PLUGIN_ID, LOADTEST_MOCK_MIN_MM_VERSION, REQUIRED_PLUGINS} from './constants';
import {ensureCustomProfileAttributeFields} from './custom-profile-attributes';
import {shouldUseLoadtestMock} from './env';
import {createMattermostClient, login} from './http-client';
import {ensureTrialLicense} from './license';
import {logInfo} from './log';
import {ensureAgentsPlugin, installRequiredPlugin} from './plugins';
import {semverGte} from './semver';
import {configureTestServer, getServerMmVersion} from './server-config';

import type {ProvisionCredentials} from './types';

export async function provisionServer(serverUrl: string, credentials: ProvisionCredentials): Promise<void> {
    const client = createMattermostClient(serverUrl);
    const token = await login(client, credentials);
    const serverMmVersion = await getServerMmVersion(client, token);
    logInfo(`Mattermost server version: ${serverMmVersion}`);

    await ensureTrialLicense(client, token);
    await configureTestServer(client, token);
    await ensureCustomProfileAttributeFields(client, token);

    const useMockLlm = shouldUseLoadtestMock() && semverGte(serverMmVersion, LOADTEST_MOCK_MIN_MM_VERSION);

    await ensureAgentsPlugin(client, token, serverMmVersion, {requireLatestMaster: useMockLlm});

    /* eslint-disable no-await-in-loop -- install required plugins one at a time for clear provisioning logs */
    for (const plugin of REQUIRED_PLUGINS) {
        if (plugin.id === AGENTS_PLUGIN_ID) {
            continue;
        }
        await installRequiredPlugin(client, token, plugin);
    }
    /* eslint-enable no-await-in-loop */

    await ensureAgentsE2EBot(client, token, serverMmVersion);

    const agentsOk = await verifyAgentsSetup(client, token);
    if (!agentsOk) {
        throw new Error('Agents E2E setup verification failed — agents tests may not pass.');
    }

    logInfo('Server provisioning complete.');
}
