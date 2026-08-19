// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
import conversationStore from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';
import {getPostById} from '@queries/servers/post';
import {logDebug} from '@utils/log';

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

jest.mock('@agents/store/conversation_store', () => ({
    __esModule: true,
    default: {
        getState: jest.fn(() => ({loading: false})),
    },
}));

jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        getServerDatabaseAndOperator: jest.fn(() => ({database: {}})),
    },
}));

jest.mock('@queries/servers/post', () => ({
    getPostById: jest.fn(),
}));

// The end/cancel refetch resolves the post and cache state asynchronously.
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

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

describe('handleAgentPostUpdate stream-settle refetch', () => {
    const makeMsg = (control: string): WebSocketMessage<PostUpdateWebsocketMessage> => ({
        event: 'custom_mattermost-ai_postupdate',
        data: {post_id: 'post123', control},
        broadcast: {
            omit_users: {},
            user_id: 'user123',
            channel_id: 'channel123',
            team_id: 'team123',
        },
        seq: 1,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getPostById).mockResolvedValue({
            props: {conversation_id: 'conv123'},
        } as unknown as Awaited<ReturnType<typeof getPostById>>);
        jest.mocked(conversationStore.getState).mockReturnValue({
            conversation: {id: 'conv123'} as never,
            loading: false,
        });
    });

    it('should refetch the cached conversation when the stream ends', async () => {
        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).toHaveBeenCalledTimes(1);
        expect(refetchConversation).toHaveBeenCalledWith(SERVER_URL, 'conv123');
    });

    it('should refetch the cached conversation when the stream is cancelled', async () => {
        handleAgentPostUpdate(SERVER_URL, makeMsg('cancel'));
        await flushAsync();

        expect(refetchConversation).toHaveBeenCalledTimes(1);
        expect(refetchConversation).toHaveBeenCalledWith(SERVER_URL, 'conv123');
    });

    it('should not refetch on non-settling control events', async () => {
        handleAgentPostUpdate(SERVER_URL, makeMsg('start'));
        handleAgentPostUpdate(SERVER_URL, makeMsg('tool_call'));
        await flushAsync();

        expect(refetchConversation).not.toHaveBeenCalled();
    });

    it('should not refetch when the conversation was never viewed (nothing cached)', async () => {
        jest.mocked(conversationStore.getState).mockReturnValue({loading: false});

        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).not.toHaveBeenCalled();
    });

    it('should not refetch when the post carries no conversation_id', async () => {
        jest.mocked(getPostById).mockResolvedValue({
            props: {},
        } as unknown as Awaited<ReturnType<typeof getPostById>>);

        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).not.toHaveBeenCalled();
    });

    it('should catch refetch rejections instead of leaving them unhandled', async () => {
        jest.mocked(refetchConversation).mockRejectedValueOnce(new Error('normalization failed'));

        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).toHaveBeenCalledTimes(1);
        expect(logDebug).toHaveBeenCalledWith('error on refetchConversationForPost', expect.anything());
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
