// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
import conversationStore from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';
import {getPostById} from '@queries/servers/post';
import {logDebug} from '@utils/log';

import {handleAgentConversationUpdated, handleAgentPostUpdate, settleStreamedPost} from './index';

import type {PostUpdateWebsocketMessage} from '@agents/types';

const SERVER_URL = 'https://test.mattermost.com';

jest.mock('@agents/store/streaming_store', () => ({
    __esModule: true,
    default: {
        handleWebSocketMessage: jest.fn(),
        removePost: jest.fn(),
        isStreaming: jest.fn(() => false),
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

    it('should keep the streamed content until the refetch settles, then drop it', async () => {
        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).toHaveBeenCalledTimes(1);
        expect(refetchConversation).toHaveBeenCalledWith(SERVER_URL, 'conv123', expect.any(Function));
        expect(streamingStore.removePost).not.toHaveBeenCalled();

        const onSettled = jest.mocked(refetchConversation).mock.calls[0][2];
        onSettled?.();
        expect(streamingStore.removePost).toHaveBeenCalledWith(SERVER_URL, 'post123');
    });

    it('should keep the state of a post that started streaming again before the refetch settled', async () => {
        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();
        jest.mocked(streamingStore.isStreaming).mockReturnValueOnce(true);

        const onSettled = jest.mocked(refetchConversation).mock.calls[0][2];
        onSettled?.();

        expect(streamingStore.removePost).not.toHaveBeenCalled();
    });

    it('should not refetch on non-settling control events', async () => {
        handleAgentPostUpdate(SERVER_URL, makeMsg('start'));
        handleAgentPostUpdate(SERVER_URL, makeMsg('tool_call'));
        handleAgentPostUpdate(SERVER_URL, makeMsg('cancel'));
        await flushAsync();

        expect(refetchConversation).not.toHaveBeenCalled();
    });

    it('should drop the streaming state without refetching when the conversation was never viewed', async () => {
        jest.mocked(conversationStore.getState).mockReturnValue({loading: false});

        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).not.toHaveBeenCalled();
        expect(streamingStore.removePost).toHaveBeenCalledWith(SERVER_URL, 'post123');
    });

    it('should leave a post without a conversation_id to POST_EDITED on end', async () => {
        jest.mocked(getPostById).mockResolvedValue({
            props: {},
        } as unknown as Awaited<ReturnType<typeof getPostById>>);

        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).not.toHaveBeenCalled();
        expect(streamingStore.removePost).not.toHaveBeenCalled();
    });

    it('should drop the state of a post without a conversation_id after a reconnect', async () => {
        jest.mocked(getPostById).mockResolvedValue({
            props: {},
        } as unknown as Awaited<ReturnType<typeof getPostById>>);

        await settleStreamedPost(SERVER_URL, 'post123', true);

        expect(refetchConversation).not.toHaveBeenCalled();
        expect(streamingStore.removePost).toHaveBeenCalledWith(SERVER_URL, 'post123');
    });

    describe('after a reconnect', () => {
        const anchorTurn = (sequence: number) => ({id: `t${sequence}`, post_id: 'post123', role: 'assistant', sequence, content: []});
        const withTurns = (turns: Array<ReturnType<typeof anchorTurn>>) => ({
            conversation: {id: 'conv123', turns} as never,
            loading: false,
        });

        it('should keep the state of a still-running stream when the refetch has no newer response', async () => {
            jest.mocked(conversationStore.getState).mockReturnValue(withTurns([anchorTurn(1)]));

            await settleStreamedPost(SERVER_URL, 'post123', true);
            jest.mocked(refetchConversation).mock.calls[0][2]?.();

            expect(streamingStore.removePost).not.toHaveBeenCalled();
        });

        it('should drop the state once the refetch shows the response finished', async () => {
            jest.mocked(conversationStore.getState).mockReturnValue(withTurns([anchorTurn(1)]));

            await settleStreamedPost(SERVER_URL, 'post123', true);
            jest.mocked(conversationStore.getState).mockReturnValue(withTurns([anchorTurn(1), anchorTurn(3)]));
            jest.mocked(refetchConversation).mock.calls[0][2]?.();

            expect(streamingStore.removePost).toHaveBeenCalledWith(SERVER_URL, 'post123');
        });

        it('should keep the state when the refetch throws', async () => {
            jest.mocked(conversationStore.getState).mockReturnValue(withTurns([]));
            jest.mocked(refetchConversation).mockRejectedValueOnce(new Error('network'));

            await settleStreamedPost(SERVER_URL, 'post123', true);

            expect(streamingStore.removePost).not.toHaveBeenCalled();
        });
    });

    it('should catch refetch rejections instead of leaving them unhandled', async () => {
        jest.mocked(refetchConversation).mockRejectedValueOnce(new Error('normalization failed'));

        handleAgentPostUpdate(SERVER_URL, makeMsg('end'));
        await flushAsync();

        expect(refetchConversation).toHaveBeenCalledTimes(1);
        expect(logDebug).toHaveBeenCalledWith('error on settleStreamedPost', expect.anything());
        expect(streamingStore.removePost).toHaveBeenCalledWith(SERVER_URL, 'post123');
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
