// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import conversationStore from '@agents/store/conversation_store';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {
    clearConversationCache,
    clearConversationCacheForServer,
    ensureConversation,
    fetchConversation,
    invalidateConversation,
    refetchConversation,
} from './conversation';

import type {ConversationResponse} from '@agents/types';

jest.mock('@actions/remote/session');
jest.mock('@managers/network_manager');
jest.mock('@utils/errors');

const serverUrl = 'https://test.mattermost.com';
const otherServerUrl = 'https://other.mattermost.com';
const conversationId = 'conv123';

const mockClient = {
    getConversation: jest.fn(),
};

function makeConversation(id: string): ConversationResponse {
    return {
        id,
        user_id: 'u',
        bot_id: 'b',
        channel_id: null,
        root_post_id: null,
        title: 'Chat',
        operation: 'dm',
        turns: [],
    };
}

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
    clearConversationCache();
});

describe('fetchConversation', () => {
    it('should return the conversation on success', async () => {
        const conversation = makeConversation(conversationId);
        mockClient.getConversation.mockResolvedValue(conversation);

        const result = await fetchConversation(serverUrl, conversationId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getConversation).toHaveBeenCalledWith(conversationId);
        expect(result).toEqual({data: conversation});
    });

    it('should return an error and log on failure', async () => {
        const error = new Error('network');
        const errorMessage = 'network error';
        mockClient.getConversation.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await fetchConversation(serverUrl, conversationId);

        expect(logError).toHaveBeenCalledWith('[fetchConversation] Failed to fetch conversation', error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(result).toEqual({error: errorMessage});
    });
});

describe('ensureConversation', () => {
    it('should fetch once, write to the store, and dedup concurrent callers', async () => {
        const conversation = makeConversation(conversationId);
        mockClient.getConversation.mockResolvedValue(conversation);

        // Two concurrent ensures share one inflight promise.
        const a = ensureConversation(serverUrl, conversationId);
        const b = ensureConversation(serverUrl, conversationId);

        expect(conversationStore.getState(serverUrl, conversationId).loading).toBe(true);

        await Promise.all([a, b]);

        expect(mockClient.getConversation).toHaveBeenCalledTimes(1);
        const state = conversationStore.getState(serverUrl, conversationId);
        expect(state.conversation).toEqual(conversation);
        expect(state.loading).toBe(false);
        expect(state.error).toBeUndefined();
    });

    it('should not refetch when a cached conversation exists', async () => {
        const conversation = makeConversation(conversationId);
        mockClient.getConversation.mockResolvedValue(conversation);

        await ensureConversation(serverUrl, conversationId);
        await ensureConversation(serverUrl, conversationId);

        expect(mockClient.getConversation).toHaveBeenCalledTimes(1);
    });

    it('should normalize null turn content to an empty array', async () => {
        const raw = {
            ...makeConversation(conversationId),
            turns: [{id: 't', post_id: 'p', role: 'assistant', content: null, sequence: 0, tokens_in: 0, tokens_out: 0}],
        };
        mockClient.getConversation.mockResolvedValue(raw);

        await ensureConversation(serverUrl, conversationId);

        const state = conversationStore.getState(serverUrl, conversationId);
        expect(state.conversation?.turns[0].content).toEqual([]);
    });

    it('should write the normalized error string into the store on failure', async () => {
        mockClient.getConversation.mockRejectedValue(new Error('network'));
        jest.mocked(getFullErrorMessage).mockReturnValue('network error');

        await ensureConversation(serverUrl, conversationId);

        const state = conversationStore.getState(serverUrl, conversationId);
        expect(state.error).toBe('network error');
        expect(state.loading).toBe(false);
    });
});

describe('refetchConversation', () => {
    it('should drop the inflight entry and trigger a new fetch even when a conversation is cached', async () => {
        const first = makeConversation(conversationId);
        const second = {...first, title: 'Updated'};
        mockClient.getConversation.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

        await ensureConversation(serverUrl, conversationId);
        expect(conversationStore.getState(serverUrl, conversationId).conversation?.title).toBe('Chat');

        await refetchConversation(serverUrl, conversationId);

        expect(mockClient.getConversation).toHaveBeenCalledTimes(2);
        expect(conversationStore.getState(serverUrl, conversationId).conversation?.title).toBe('Updated');
    });
});

describe('invalidateConversation', () => {
    it('should drop the cache entry without triggering a fetch', async () => {
        mockClient.getConversation.mockResolvedValue(makeConversation(conversationId));
        await ensureConversation(serverUrl, conversationId);
        expect(mockClient.getConversation).toHaveBeenCalledTimes(1);

        invalidateConversation(serverUrl, conversationId);

        const state = conversationStore.getState(serverUrl, conversationId);
        expect(state.conversation).toBeUndefined();
        expect(state.loading).toBe(false);
        expect(mockClient.getConversation).toHaveBeenCalledTimes(1);
    });
});

describe('clearConversationCacheForServer', () => {
    it('should drop only the targeted server cache and leave others intact', async () => {
        const convA = {...makeConversation('c1'), title: 'A'};
        const convB = {...makeConversation('c1'), title: 'B'};
        mockClient.getConversation.
            mockImplementationOnce(() => Promise.resolve(convA)).
            mockImplementationOnce(() => Promise.resolve(convB));

        await ensureConversation(serverUrl, 'c1');
        await ensureConversation(otherServerUrl, 'c1');

        clearConversationCacheForServer(serverUrl);

        expect(conversationStore.getState(serverUrl, 'c1').conversation).toBeUndefined();
        expect(conversationStore.getState(otherServerUrl, 'c1').conversation?.title).toBe('B');
    });
});
