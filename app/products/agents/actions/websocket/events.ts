// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WebsocketEvents} from '@constants';

import {handleAgentsPluginDisabled, handleAgentsPluginEnabled} from './version';

export async function handleAgentsEvents(serverUrl: string, msg: WebSocketMessage) {
    switch (msg.event) {
        case WebsocketEvents.PLUGIN_ENABLED:
            handleAgentsPluginEnabled(serverUrl, msg.data.manifest);
            break;
        case WebsocketEvents.PLUGIN_DISABLED:
            handleAgentsPluginDisabled(serverUrl, msg.data.manifest);
            break;
        default:
            break;
    }
}
