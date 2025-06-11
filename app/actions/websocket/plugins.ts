// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {handlePlaybookPluginDisabled, handlePlaybookPluginEnabled} from '@playbooks/actions/websocket/version';

export async function handlePluginEnabled(serverUrl: string, msg: WebSocketMessage) {
    const manifest = msg.data?.manifest;
    if (!manifest) {
        return;
    }

    await handlePlaybookPluginEnabled(serverUrl, manifest);
}

export async function handlePluginDisabled(serverUrl: string, msg: WebSocketMessage) {
    const manifest = msg.data?.manifest;
    if (!manifest) {
        return;
    }

    await handlePlaybookPluginDisabled(serverUrl, manifest);
}
