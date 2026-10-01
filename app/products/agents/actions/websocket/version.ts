// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {clearAIBots} from '@agents/actions/local/bots';
import {setAgentsVersion} from '@agents/actions/local/version';
import {fetchAIBots} from '@agents/actions/remote/bots';
import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';
import {isAgentsVersionSupported} from '@agents/database/queries/version';

export async function handleAgentsPluginEnabled(serverUrl: string, manifest: ClientPluginManifest) {
    if (manifest.id !== AGENTS_PLUGIN_ID) {
        return;
    }
    await setAgentsVersion(serverUrl, manifest.version);
    if (isAgentsVersionSupported(manifest.version)) {
        fetchAIBots(serverUrl);
    } else {
        clearAIBots(serverUrl);
    }
}

export async function handleAgentsPluginDisabled(serverUrl: string, manifest: ClientPluginManifest) {
    if (manifest.id !== AGENTS_PLUGIN_ID) {
        return;
    }
    await setAgentsVersion(serverUrl, '');
    clearAIBots(serverUrl);
}
