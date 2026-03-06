// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';

import {WebsocketEvents} from '@constants';

import {handleAgentsEvents} from './events';
import {handleAgentsPluginEnabled, handleAgentsPluginDisabled} from './version';

const serverUrl = 'test-server.com';

jest.mock('./version');

describe('handleAgentsEvents', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call handleAgentsPluginEnabled when PLUGIN_ENABLED event is received', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        const msg: WebSocketMessage = {
            event: WebsocketEvents.PLUGIN_ENABLED,
            data: {manifest},
            broadcast: {
                channel_id: '',
                team_id: '',
                user_id: '',
                omit_users: {},
            },
            seq: 1,
        };

        await handleAgentsEvents(serverUrl, msg);

        expect(handleAgentsPluginEnabled).toHaveBeenCalledWith(serverUrl, manifest);
        expect(handleAgentsPluginEnabled).toHaveBeenCalledTimes(1);
        expect(handleAgentsPluginDisabled).not.toHaveBeenCalled();
    });

    it('should call handleAgentsPluginDisabled when PLUGIN_DISABLED event is received', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        const msg: WebSocketMessage = {
            event: WebsocketEvents.PLUGIN_DISABLED,
            data: {manifest},
            broadcast: {
                channel_id: '',
                team_id: '',
                user_id: '',
                omit_users: {},
            },
            seq: 1,
        };

        await handleAgentsEvents(serverUrl, msg);

        expect(handleAgentsPluginDisabled).toHaveBeenCalledWith(serverUrl, manifest);
        expect(handleAgentsPluginDisabled).toHaveBeenCalledTimes(1);
        expect(handleAgentsPluginEnabled).not.toHaveBeenCalled();
    });

    it('should not call any handler for unrelated events', async () => {
        const msg: WebSocketMessage = {
            event: 'some_other_event',
            data: {},
            broadcast: {
                channel_id: '',
                team_id: '',
                user_id: '',
                omit_users: {},
            },
            seq: 1,
        };

        await handleAgentsEvents(serverUrl, msg);

        expect(handleAgentsPluginEnabled).not.toHaveBeenCalled();
        expect(handleAgentsPluginDisabled).not.toHaveBeenCalled();
    });
});
