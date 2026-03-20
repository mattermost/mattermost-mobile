// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAgentsVersion} from '@agents/actions/local/version';
import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';

export async function handleAgentsPluginEnabled(serverUrl: string, manifest: ClientPluginManifest) {
    if (manifest.id !== AGENTS_PLUGIN_ID) {
        return;
    }
    setAgentsVersion(serverUrl, manifest.version);
}

export async function handleAgentsPluginDisabled(serverUrl: string, manifest: ClientPluginManifest) {
    if (manifest.id !== AGENTS_PLUGIN_ID) {
        return;
    }
    setAgentsVersion(serverUrl, '');
}
