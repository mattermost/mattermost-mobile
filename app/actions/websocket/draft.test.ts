// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DraftSyncManager from '@managers/draft_sync_manager';

import {handleDraftWebSocketEvent} from './draft';

jest.mock('@managers/draft_sync_manager', () => ({
    __esModule: true,
    default: {enqueueWebSocketEvent: jest.fn()},
}));

describe('handleDraftWebSocketEvent', () => {
    const serverUrl = 'https://server.test';

    const draftEvent = (event: string): WebSocketMessage => ({
        event,
        data: {draft: '{"channel_id":"c","root_id":"","message":"hi"}'},
        broadcast: {} as WebsocketBroadcast,
        seq: 1,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes a draft_created event to DraftSyncManager.enqueueWebSocketEvent', () => {
        const msg = draftEvent('draft_created');
        handleDraftWebSocketEvent(serverUrl, msg);
        expect(DraftSyncManager.enqueueWebSocketEvent).toHaveBeenCalledWith(serverUrl, msg);
    });

    it('routes a draft_deleted event to DraftSyncManager.enqueueWebSocketEvent', () => {
        const msg = draftEvent('draft_deleted');
        handleDraftWebSocketEvent(serverUrl, msg);
        expect(DraftSyncManager.enqueueWebSocketEvent).toHaveBeenCalledWith(serverUrl, msg);
    });
});
