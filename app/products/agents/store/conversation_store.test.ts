// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchConversation} from '@agents/actions/remote/conversation';
import {act, renderHook} from '@testing-library/react-hooks';

import {
    clearConversationCache,
    invalidateConversation,
    useConversation,
    useTurnForPost,
} from './conversation_store';

import type {ConversationResponse} from '@agents/types';

jest.mock('@agents/actions/remote/conversation');

const mockedFetch = jest.mocked(fetchConversation);

const SERVER_URL = 'https://test.mattermost.com';

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

// clearConversationCache() drops every cached subject and inflight entry, so
// each test starts from a fresh store. jest.resetModules() would also work
// but would force a re-import of React via the test renderer, breaking
// renderHook's identity assumptions.
beforeEach(() => {
    mockedFetch.mockReset();
    clearConversationCache();
});

describe('useConversation', () => {
    it('kicks off a fetch and resolves to the returned conversation', async () => {
        const conv = makeConversation('c1');
        mockedFetch.mockResolvedValue({data: conv});

        const {result, waitForNextUpdate} = renderHook(() => useConversation(SERVER_URL, 'c1'));

        expect(result.current.loading).toBe(true);
        expect(result.current.conversation).toBeUndefined();

        await waitForNextUpdate();

        expect(mockedFetch).toHaveBeenCalledWith(SERVER_URL, 'c1');
        expect(result.current.conversation).toEqual(conv);
        expect(result.current.error).toBeUndefined();
        expect(result.current.loading).toBe(false);
    });

    it('dedups concurrent subscribers for the same id', async () => {
        const conv = makeConversation('c1');
        mockedFetch.mockResolvedValue({data: conv});

        const hookA = renderHook(() => useConversation(SERVER_URL, 'c1'));
        const hookB = renderHook(() => useConversation(SERVER_URL, 'c1'));

        await hookA.waitForNextUpdate();

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(hookA.result.current.conversation).toEqual(conv);
        expect(hookB.result.current.conversation).toEqual(conv);
    });

    it('caches errors so a remount with the same id does not retry', async () => {
        mockedFetch.mockResolvedValueOnce({error: 'boom'});

        const first = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await first.waitForNextUpdate();

        expect(first.result.current.error).toBe('boom');
        expect(mockedFetch).toHaveBeenCalledTimes(1);

        first.unmount();

        // Second subscriber inherits the cached error — no retry until invalidate.
        const second = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await flush();

        expect(second.result.current.error).toBe('boom');
        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('returns the initial state for an undefined id and performs no fetch', () => {
        const {result} = renderHook(() => useConversation(SERVER_URL, undefined));

        expect(result.current.loading).toBe(false);
        expect(result.current.conversation).toBeUndefined();
        expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('normalizes null turn content to an empty array', async () => {
        // The backend may serialise content as the JSON literal `null`.
        const rawConversation = {
            ...makeConversation('c1'),
            turns: [{id: 't1', post_id: 'p', role: 'assistant', content: null, sequence: 0, tokens_in: 0, tokens_out: 0}],
        } as unknown as ConversationResponse;
        mockedFetch.mockResolvedValue({data: rawConversation});

        const hook = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await hook.waitForNextUpdate();

        expect(hook.result.current.conversation?.turns[0].content).toEqual([]);
    });
});

describe('invalidateConversation', () => {
    it('drops the cached entry and triggers a fresh fetch', async () => {
        const first = makeConversation('c1');
        const second = {...makeConversation('c1'), title: 'Updated'};
        mockedFetch.mockResolvedValueOnce({data: first}).mockResolvedValueOnce({data: second});

        const hook = renderHook(() => useConversation(SERVER_URL, 'c1'));
        await hook.waitForNextUpdate();
        expect(hook.result.current.conversation?.title).toBe('Chat');

        act(() => {
            invalidateConversation(SERVER_URL, 'c1');
        });
        await hook.waitForNextUpdate();

        expect(mockedFetch).toHaveBeenCalledTimes(2);
        expect(hook.result.current.conversation?.title).toBe('Updated');
    });
});

describe('useTurnForPost', () => {
    it('finds the anchor turn by post_id', () => {
        const conversation = {
            ...makeConversation('c1'),
            turns: [
                {id: 't0', post_id: null, role: 'user' as const, content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                {id: 't1', post_id: 'p1', role: 'assistant' as const, content: [], sequence: 1, tokens_in: 0, tokens_out: 0},
            ],
        };

        const {result} = renderHook(() => useTurnForPost(conversation, 'p1'));

        expect(result.current?.id).toBe('t1');
    });

    it('returns undefined when the conversation is missing', () => {
        const {result} = renderHook(() => useTurnForPost(undefined, 'p1'));
        expect(result.current).toBeUndefined();
    });
});
