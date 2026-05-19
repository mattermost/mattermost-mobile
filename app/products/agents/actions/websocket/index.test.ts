// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
import streamingStore from '@agents/store/streaming_store';

import {handleAgentConversationUpdated, handleAgentPostUpdate} from './index';

import type {PostUpdateWebsocketMessage} from '@agents/types';

const SERVER_URL = 'https://test.mattermost.com';

jest.mock('@agents/store/streaming_store', () => ({
    __esModule: true,
    default: {
        handleWebSocketMessage: jest.fn(),
    },
}));

jest.mock('@agents/actions/remote/conversation', () => ({
    refetchConversation: jest.fn(),
}));

describe('handleAgentPostUpdate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call streamingStore.handleWebSocketMessage with serverUrl and message data', () => {
        const messageData: PostUpdateWebsocketMessage = {
            post_id: 'post123',
            next: 'Hello world',
            control: 'start',
        };

        const msg: WebSocketMessage<PostUpdateWebsocketMessage> = {
            event: 'custom_mattermost-ai_postupdate',
            data: messageData,
            broadcast: {
                omit_users: {},
                user_id: 'user123',
                channel_id: 'channel123',
                team_id: 'team123',
            },
            seq: 1,
        };

        handleAgentPostUpdate(SERVER_URL, msg);

        expect(streamingStore.handleWebSocketMessage).toHaveBeenCalledTimes(1);
        expect(streamingStore.handleWebSocketMessage).toHaveBeenCalledWith(SERVER_URL, messageData);
    });

    it('should return early when data is undefined', () => {
        const msg = {
            event: 'custom_mattermost-ai_postupdate',
            data: undefined,
            broadcast: {
                omit_users: {},
                user_id: 'user123',
                channel_id: 'channel123',
                team_id: 'team123',
            },
            seq: 1,
        };

        handleAgentPostUpdate(SERVER_URL, msg as unknown as WebSocketMessage<PostUpdateWebsocketMessage>);

        expect(streamingStore.handleWebSocketMessage).not.toHaveBeenCalled();
    });

    it('should return early when data is null', () => {
        const msg = {
            event: 'custom_mattermost-ai_postupdate',
            data: null,
            broadcast: {
                omit_users: {},
                user_id: 'user123',
                channel_id: 'channel123',
                team_id: 'team123',
            },
            seq: 2,
        };

        handleAgentPostUpdate(SERVER_URL, msg as unknown as WebSocketMessage<PostUpdateWebsocketMessage>);

        expect(streamingStore.handleWebSocketMessage).not.toHaveBeenCalled();
    });
});

describe('handleAgentConversationUpdated', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should refetch the conversation for the given id', () => {
        const msg = {
            event: 'custom_mattermost-ai_conversation_updated',
            data: {conversation_id: 'conv123'},
            broadcast: {
                omit_users: {},
                user_id: 'user123',
                channel_id: 'channel123',
                team_id: 'team123',
            },
            seq: 3,
        };

        handleAgentConversationUpdated(SERVER_URL, msg as unknown as WebSocketMessage<{conversation_id?: string}>);

        expect(refetchConversation).toHaveBeenCalledTimes(1);
        expect(refetchConversation).toHaveBeenCalledWith(SERVER_URL, 'conv123');
    });

    it('should not refetch when conversation_id is missing', () => {
        const msg = {
            event: 'custom_mattermost-ai_conversation_updated',
            data: {},
            broadcast: {
                omit_users: {},
                user_id: 'user123',
                channel_id: 'channel123',
                team_id: 'team123',
            },
            seq: 4,
        };

        handleAgentConversationUpdated(SERVER_URL, msg as unknown as WebSocketMessage<{conversation_id?: string}>);

        expect(refetchConversation).not.toHaveBeenCalled();
    });
});
