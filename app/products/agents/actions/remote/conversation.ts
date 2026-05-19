// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// This module owns inflight tracking and writes results into the ephemeral
// conversation store. The pattern (action drives an RxJS store rather than
// WatermelonDB) is deliberate: it mirrors the webapp plugin's
// `webapp/src/hooks/use_conversation.ts` so both clients share the same
// ownership boundary — store stores, action fetches.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import conversationStore from '@agents/store/conversation_store';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {ConversationResponse} from '@agents/types';

const inflight = new Map<string, Promise<void>>();

const inflightKey = (serverUrl: string, conversationId: string) => `${serverUrl}:${conversationId}`;

// Backend may serialise turn.content as the JSON literal `null`; coerce to []
// so downstream code can iterate without a guard.
function normalizeConversationResponse(raw: ConversationResponse): ConversationResponse {
    return {
        ...raw,
        turns: (raw.turns ?? []).map((turn) => ({
            ...turn,
            content: turn.content ?? [],
        })),
    };
}

// The server applies per-user privacy filtering on the response, so callers
// don't need a separate private fetch.
export async function fetchConversation(
    serverUrl: string,
    conversationId: string,
): Promise<{data?: ConversationResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.getConversation(conversationId);
        return {data};
    } catch (error) {
        logError('[fetchConversation] Failed to fetch conversation', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error: getFullErrorMessage(error)};
    }
}

function runFetch(serverUrl: string, conversationId: string): Promise<void> {
    const key = inflightKey(serverUrl, conversationId);
    const promise = fetchConversation(serverUrl, conversationId).then(({data, error}) => {
        inflight.delete(key);
        const prev = conversationStore.getState(serverUrl, conversationId);
        if (error) {
            // Preserve cached data on error so transient failures don't blank
            // the UI; invalidate() is required to drop it.
            conversationStore.setState(serverUrl, conversationId, {
                conversation: prev.conversation,
                loading: false,
                error,
            });
            return;
        }
        conversationStore.setState(serverUrl, conversationId, {
            conversation: data && normalizeConversationResponse(data),
            loading: false,
        });
    });
    inflight.set(key, promise);
    return promise;
}

/**
 * Load a conversation if it's not cached and no request is inflight. Safe to
 * call from a hook's effect — repeated calls dedup via the inflight map.
 */
export function ensureConversation(serverUrl: string, conversationId: string): Promise<void> {
    const key = inflightKey(serverUrl, conversationId);
    const existing = inflight.get(key);
    if (existing) {
        return existing;
    }
    const {conversation, error, loading} = conversationStore.getState(serverUrl, conversationId);
    if (conversation || error || loading) {
        return Promise.resolve();
    }
    conversationStore.setState(serverUrl, conversationId, {loading: true});
    return runFetch(serverUrl, conversationId);
}

/**
 * Force a fresh fetch. Drops any inflight request and any cached error, but
 * keeps the cached conversation visible while the new fetch is in flight so
 * the UI doesn't blank out during streaming-end re-syncs.
 */
export function refetchConversation(serverUrl: string, conversationId: string): Promise<void> {
    const key = inflightKey(serverUrl, conversationId);
    inflight.delete(key);
    const prev = conversationStore.getState(serverUrl, conversationId);
    conversationStore.setState(serverUrl, conversationId, {
        conversation: prev.conversation,
        loading: true,
        error: undefined,
    });
    return runFetch(serverUrl, conversationId);
}

/**
 * Drop the cached entry without re-fetching. Subscribers see the initial
 * (loading: false, no conversation) state.
 */
export function invalidateConversation(serverUrl: string, conversationId: string): void {
    inflight.delete(inflightKey(serverUrl, conversationId));
    conversationStore.evict(serverUrl, conversationId);
}

/** Drop every cached conversation belonging to a single server (per-server logout). */
export function clearConversationCacheForServer(serverUrl: string): void {
    for (const key of [...inflight.keys()]) {
        if (key.startsWith(`${serverUrl}:`)) {
            inflight.delete(key);
        }
    }
    conversationStore.removeServer(serverUrl);
}

/** Full reset across all servers (test cleanup). */
export function clearConversationCache(): void {
    inflight.clear();
    conversationStore.clear();
}
