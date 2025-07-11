// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WebsocketEvents} from '@constants';
import {WEBSOCKET_EVENTS} from '@playbooks/constants/websocket';

import {
    handlePlaybookChecklistItemUpdated,
    handlePlaybookChecklistUpdated,
    handlePlaybookRunCreated,
    handlePlaybookRunUpdated,
    handlePlaybookRunUpdatedIncremental,
} from './runs';
import {handlePlaybookPluginDisabled, handlePlaybookPluginEnabled} from './version';

export async function handlePlaybookEvents(serverUrl: string, msg: WebSocketMessage) {
    switch (msg.event) {
        case WebsocketEvents.PLUGIN_ENABLED:
            handlePlaybookPluginEnabled(serverUrl, msg.data.manifest);
            break;
        case WebsocketEvents.PLUGIN_DISABLED:
            handlePlaybookPluginDisabled(serverUrl, msg.data.manifest);
            break;
        case WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_RUN_UPDATED:
            handlePlaybookRunUpdated(serverUrl, msg);
            break;
        case WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_RUN_CREATED:
            handlePlaybookRunCreated(serverUrl, msg);
            break;
        case WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_RUN_UPDATED_INCREMENTAL:
            handlePlaybookRunUpdatedIncremental(serverUrl, msg);
            break;
        case WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_CHECKLIST_UPDATED:
            handlePlaybookChecklistUpdated(serverUrl, msg);
            break;
        case WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_CHECKLIST_ITEM_UPDATED:
            handlePlaybookChecklistItemUpdated(serverUrl, msg);
            break;
        default:
            break;
    }
}
