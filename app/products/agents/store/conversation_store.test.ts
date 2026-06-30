// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook, waitFor} from '@testing-library/react-native';

import {
    clearConversationCacheForServer,
    invalidateConversation,
    refetchConversation,
} from '@agents/actions/remote/conversation';
import NetworkManager from '@managers/network_manager';

import {useConversation} from './conversation_store';

import type {ConversationResponse} from '@agents/types';

jest.mock('@actions/remote/session');
jest.mock('@managers/network_manager');
jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn((err) => (err instanceof Error ? err.message : 'error')),
}));

const mockClient = {
    getConversation: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

const mockedFetch = mockClient.getConversation;

const SERVER_URL = 'https://server-a.test';
const SERVER_B = 'https://server-b.test';

function makeConversation(id: string): ConversationResponse {
    return {
        id,
        user_id: 'user1',
        bot_id: 'bot1',
        channel_id: null,
        root_post_id: null,
        title: 'Chat',
        operation: 'dm',
        turns: [],
    };
}

async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    mockedFetch.mockReset();
    clearConversationCacheForServer(SERVER_URL);
    clearConversationCacheForServer(SERVER_B);
});

describe('useConversation', () => {
    it('should kick off a fetch and resolve to the returned conversation', async () => {
        const conv = makeConversation('c1');
        mockedFetch.mockResolvedValue(conv);

        const {result} = renderHook(() => useConversation(SERVER_URL, 'c1'));

        expect(result.current.loading).toBe(true);
        expect(result.current.conversation).toBeUndefined();

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockedFetch).toHaveBeenCalledWith('c1');
        expect(NetworkManager.getClient).toHaveBeenCalledWith(SERVER_URL);
        expect(result.current.conversation).toEqual(conv);
        expect(result.current.error).toBeUndefined();
    });

    it('should dedup concurrent subscribers for the same id', async () => {
        const conv = makeConversation('c1');
        mockedFetch.mockResolvedValue(conv);

        const hookA = renderHook(() => useConversation(SERVER_URL, 'c1'));
        const hookB = renderHook(() => useConversation(SERVER_URL, 'c1'));

        await waitFor(() => expect(hookA.result.current.conversation).toEqual(conv));

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(hookB.result.current.conversation).toEqual(conv);
    });

    it('should cache errors so a remount with the same id does not retry', async () => {
        mockedFetch.mockRejectedValueOnce(new Error('boom'));

        const first = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await waitFor(() => expect(first.result.current.error).toBe('boom'));

        expect(mockedFetch).toHaveBeenCalledTimes(1);

        first.unmount();

        // Second subscriber inherits the cached error — no retry until invalidate.
        const second = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await flush();

        expect(second.result.current.error).toBe('boom');
        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('should return the initial state for an undefined id and perform no fetch', () => {
        const {result} = renderHook(() => useConversation(SERVER_URL, undefined));

        expect(result.current.loading).toBe(false);
        expect(result.current.conversation).toBeUndefined();
        expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should normalize null turn content to an empty array', async () => {
        // The backend may serialise content as the JSON literal `null`.
        const rawConversation = {
            ...makeConversation('c1'),
            turns: [{id: 't1', post_id: 'p', role: 'assistant', content: null, sequence: 0, tokens_in: 0, tokens_out: 0}],
        } as unknown as ConversationResponse;
        mockedFetch.mockResolvedValue(rawConversation);

        const hook = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await waitFor(() => expect(hook.result.current.conversation?.turns[0].content).toEqual([]));
    });
});

describe('invalidateConversation', () => {
    it('should drop the cached entry from the subscriber state without triggering a fresh fetch', async () => {
        mockedFetch.mockResolvedValue(makeConversation('c1'));

        const hook = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await waitFor(() => expect(hook.result.current.conversation?.title).toBe('Chat'));
        expect(mockedFetch).toHaveBeenCalledTimes(1);

        act(() => {
            invalidateConversation(SERVER_URL, 'c1');
        });
        await flush();

        // The subscriber sees the entry cleared; invalidate alone does not
        // refetch — callers that need fresh data call refetchConversation.
        expect(hook.result.current.conversation).toBeUndefined();
        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });
});

describe('refetchConversation', () => {
    it('should drop the cached entry and trigger a fresh fetch even when no subscriber is mounted', async () => {
        const first = makeConversation('c1');
        const second = {...makeConversation('c1'), title: 'Updated'};
        mockedFetch.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

        const hook = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await waitFor(() => expect(hook.result.current.conversation?.title).toBe('Chat'));

        await act(async () => {
            await refetchConversation(SERVER_URL, 'c1');
        });

        expect(mockedFetch).toHaveBeenCalledTimes(2);
        expect(hook.result.current.conversation?.title).toBe('Updated');
    });
});

describe('per-server isolation', () => {
    it('should keep conversations with the same id on different servers isolated', async () => {
        const convA = {...makeConversation('c1'), title: 'A'};
        const convB = {...makeConversation('c1'), title: 'B'};
        const clientA = {getConversation: jest.fn().mockResolvedValue(convA)};
        const clientB = {getConversation: jest.fn().mockResolvedValue(convB)};
        jest.mocked(NetworkManager.getClient).mockImplementation((url) => (
            (url === SERVER_URL ? clientA : clientB) as any
        ));

        const hookA = renderHook(() => useConversation(SERVER_URL, 'c1'));
        const hookB = renderHook(() => useConversation(SERVER_B, 'c1'));

        await waitFor(() => {
            expect(hookA.result.current.conversation?.title).toBe('A');
            expect(hookB.result.current.conversation?.title).toBe('B');
        });

        expect(clientA.getConversation).toHaveBeenCalledWith('c1');
        expect(clientB.getConversation).toHaveBeenCalledWith('c1');

        // Reset for subsequent tests
        jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
    });
});
