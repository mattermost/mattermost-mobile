// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WebsocketEvents} from '@constants';
import {PLAYBOOKS_PLUGIN_ID} from '@playbooks/constants/plugin';
import {WEBSOCKET_EVENTS} from '@playbooks/constants/websocket';
import TestHelper from '@test/test_helper';

import {handlePlaybookEvents} from './events';
import {
    handlePlaybookRunCreated,
    handlePlaybookRunUpdated,
    handlePlaybookRunUpdatedIncremental,
} from './runs';
import {handlePlaybookPluginDisabled, handlePlaybookPluginEnabled} from './version';

const serverUrl = 'test-server.com';

jest.mock('./runs');
jest.mock('./version');

describe('handlePlaybookEvents', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle PLUGIN_ENABLED event', async () => {
        const manifest: ClientPluginManifest = {
            id: PLAYBOOKS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/playbooks.js',
            },
        };

        const msg = TestHelper.fakeWebsocketMessage({
            event: WebsocketEvents.PLUGIN_ENABLED,
            data: {manifest},
        });

        await handlePlaybookEvents(serverUrl, msg);

        expect(handlePlaybookPluginEnabled).toHaveBeenCalledWith(serverUrl, manifest);
        expect(handlePlaybookPluginEnabled).toHaveBeenCalledTimes(1);
        expect(handlePlaybookPluginDisabled).not.toHaveBeenCalled();
        expect(handlePlaybookRunCreated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdatedIncremental).not.toHaveBeenCalled();
    });

    it('should handle PLUGIN_DISABLED event', async () => {
        const manifest: ClientPluginManifest = {
            id: PLAYBOOKS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/playbooks.js',
            },
        };

        const msg = TestHelper.fakeWebsocketMessage({
            event: WebsocketEvents.PLUGIN_DISABLED,
            data: {manifest},
        });

        await handlePlaybookEvents(serverUrl, msg);

        expect(handlePlaybookPluginDisabled).toHaveBeenCalledWith(serverUrl, manifest);
        expect(handlePlaybookPluginDisabled).toHaveBeenCalledTimes(1);
        expect(handlePlaybookPluginEnabled).not.toHaveBeenCalled();
        expect(handlePlaybookRunCreated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdatedIncremental).not.toHaveBeenCalled();
    });

    it('should handle WEBSOCKET_PLAYBOOK_RUN_CREATED event', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            event: WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_RUN_CREATED,
            data: {
                payload: JSON.stringify({
                    playbook_run: {id: 'run1'},
                }),
            },
        });

        await handlePlaybookEvents(serverUrl, msg);

        expect(handlePlaybookRunCreated).toHaveBeenCalledWith(serverUrl, msg);
        expect(handlePlaybookRunCreated).toHaveBeenCalledTimes(1);
        expect(handlePlaybookRunUpdated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdatedIncremental).not.toHaveBeenCalled();
        expect(handlePlaybookPluginEnabled).not.toHaveBeenCalled();
        expect(handlePlaybookPluginDisabled).not.toHaveBeenCalled();
    });

    it('should handle WEBSOCKET_PLAYBOOK_RUN_UPDATED event', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            event: WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_RUN_UPDATED,
            data: {
                payload: JSON.stringify({
                    id: 'run1',
                }),
            },
        });

        await handlePlaybookEvents(serverUrl, msg);

        expect(handlePlaybookRunUpdated).toHaveBeenCalledWith(serverUrl, msg);
        expect(handlePlaybookRunUpdated).toHaveBeenCalledTimes(1);
        expect(handlePlaybookRunCreated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdatedIncremental).not.toHaveBeenCalled();
        expect(handlePlaybookPluginEnabled).not.toHaveBeenCalled();
        expect(handlePlaybookPluginDisabled).not.toHaveBeenCalled();
    });

    it('should handle WEBSOCKET_PLAYBOOK_RUN_UPDATED_INCREMENTAL event', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            event: WEBSOCKET_EVENTS.WEBSOCKET_PLAYBOOK_RUN_UPDATED_INCREMENTAL,
            data: {
                payload: JSON.stringify({
                    id: 'run1',
                    changed_fields: {},
                }),
            },
        });

        await handlePlaybookEvents(serverUrl, msg);

        expect(handlePlaybookRunUpdatedIncremental).toHaveBeenCalledWith(serverUrl, msg);
        expect(handlePlaybookRunUpdatedIncremental).toHaveBeenCalledTimes(1);
        expect(handlePlaybookRunCreated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdated).not.toHaveBeenCalled();
        expect(handlePlaybookPluginEnabled).not.toHaveBeenCalled();
        expect(handlePlaybookPluginDisabled).not.toHaveBeenCalled();
    });

    it('should handle unknown event by doing nothing', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            event: 'unknown_event',
            data: {},
        });

        await handlePlaybookEvents(serverUrl, msg);

        expect(handlePlaybookRunCreated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdated).not.toHaveBeenCalled();
        expect(handlePlaybookRunUpdatedIncremental).not.toHaveBeenCalled();
        expect(handlePlaybookPluginEnabled).not.toHaveBeenCalled();
        expect(handlePlaybookPluginDisabled).not.toHaveBeenCalled();
    });
});

