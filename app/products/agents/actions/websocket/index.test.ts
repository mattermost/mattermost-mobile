// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {invalidateConversation} from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';

import {handleAgentConversationUpdated, handleAgentPostUpdate} from './index';

import type {PostUpdateWebsocketMessage} from '@agents/types';

// Mock the streaming store
jest.mock('@agents/store/streaming_store', () => ({
    __esModule: true,
    default: {
        handleWebSocketMessage: jest.fn(),
    },
}));

jest.mock('@agents/store/conversation_store', () => ({
    invalidateConversation: jest.fn(),
}));

describe('handleAgentPostUpdate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call streamingStore.handleWebSocketMessage with message data and serverUrl', () => {
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

        handleAgentPostUpdate('https://test.mattermost.com', msg);

        expect(streamingStore.handleWebSocketMessage).toHaveBeenCalledTimes(1);
        expect(streamingStore.handleWebSocketMessage).toHaveBeenCalledWith(messageData, 'https://test.mattermost.com');
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

        handleAgentPostUpdate('https://test.mattermost.com', msg as unknown as WebSocketMessage<PostUpdateWebsocketMessage>);

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

        handleAgentPostUpdate('https://test.mattermost.com', msg as unknown as WebSocketMessage<PostUpdateWebsocketMessage>);

        expect(streamingStore.handleWebSocketMessage).not.toHaveBeenCalled();
    });
});

describe('handleAgentConversationUpdated', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should invalidate the conversation cache for the given id', () => {
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

        handleAgentConversationUpdated('https://test.mattermost.com', msg as unknown as WebSocketMessage<{conversation_id?: string}>);

        expect(invalidateConversation).toHaveBeenCalledTimes(1);
        expect(invalidateConversation).toHaveBeenCalledWith('https://test.mattermost.com', 'conv123');
    });

    it('should not invalidate when conversation_id is missing', () => {
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

        handleAgentConversationUpdated('https://test.mattermost.com', msg as unknown as WebSocketMessage<{conversation_id?: string}>);

        expect(invalidateConversation).not.toHaveBeenCalled();
    });
});
