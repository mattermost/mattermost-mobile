// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setPlaybooksVersion} from '@playbooks/actions/local/version';
import {PLAYBOOKS_PLUGIN_ID} from '@playbooks/constants/plugin';

export async function handlePlaybookPluginEnabled(serverUrl: string, manifest: ClientPluginManifest) {
    if (manifest.id !== PLAYBOOKS_PLUGIN_ID) {
        return;
    }
    setPlaybooksVersion(serverUrl, manifest.version);
}

export async function handlePlaybookPluginDisabled(serverUrl: string, manifest: ClientPluginManifest) {
    if (manifest.id !== PLAYBOOKS_PLUGIN_ID) {
        return;
    }
    setPlaybooksVersion(serverUrl, '');
}
