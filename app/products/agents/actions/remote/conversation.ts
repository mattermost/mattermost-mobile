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

// Callbacks waiting for the next fetch result applied for a conversation,
// whichever request ends up delivering it.
const settleCallbacks = new Map<string, Array<() => void>>();

function drainSettleCallbacks(key: string) {
    const callbacks = settleCallbacks.get(key);
    if (callbacks) {
        settleCallbacks.delete(key);
        callbacks.forEach((callback) => callback());
    }
}

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
        const errorMessage = getFullErrorMessage(error);
        logError('[fetchConversation] Failed to fetch conversation', errorMessage);
        forceLogoutIfNecessary(serverUrl, error);
        return {error: errorMessage};
    }
}

function runFetch(serverUrl: string, conversationId: string): Promise<void> {
    const key = inflightKey(serverUrl, conversationId);
    const promise = fetchConversation(serverUrl, conversationId).then(({data, error}) => {
        // Identity-check the inflight promise so a fetch superseded mid-flight
        // by refetchConversation/invalidateConversation can't overwrite the
        // newer fetch's result with stale pre-stream-end data.
        if (inflight.get(key) !== promise) {
            return;
        }
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
        } else {
            conversationStore.setState(serverUrl, conversationId, {
                conversation: data && normalizeConversationResponse(data),
                loading: false,
            });
        }

        // Synchronously after the store update so subscribers see both
        // changes in one render.
        drainSettleCallbacks(key);
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
 * the UI doesn't blank out during streaming-end re-syncs. runFetch replaces
 * the inflight map entry, so a superseded fetch that resolves later fails the
 * identity check and its result is discarded.
 * `onSettled` runs once a result (or error) from this or a superseding fetch
 * has been written to the store.
 */
export function refetchConversation(serverUrl: string, conversationId: string, onSettled?: () => void): Promise<void> {
    const key = inflightKey(serverUrl, conversationId);
    if (onSettled) {
        settleCallbacks.set(key, [...(settleCallbacks.get(key) ?? []), onSettled]);
    }
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
 * Discard any inflight fetch so its result never reaches the store, keeping
 * the cached conversation as-is.
 */
export function cancelConversationFetch(serverUrl: string, conversationId: string): void {
    const key = inflightKey(serverUrl, conversationId);
    if (!inflight.delete(key)) {
        return;
    }
    const prev = conversationStore.getState(serverUrl, conversationId);
    conversationStore.setState(serverUrl, conversationId, {
        conversation: prev.conversation,
        loading: false,
    });
    drainSettleCallbacks(key);
}

/**
 * Drop the cached entry without re-fetching. Subscribers see the initial
 * (loading: false, no conversation) state.
 */
export function invalidateConversation(serverUrl: string, conversationId: string): void {
    const key = inflightKey(serverUrl, conversationId);
    inflight.delete(key);
    conversationStore.evict(serverUrl, conversationId);
    drainSettleCallbacks(key);
}

/** Drop every cached conversation belonging to a single server (per-server logout). */
export function clearConversationCacheForServer(serverUrl: string): void {
    for (const key of [...inflight.keys()]) {
        if (key.startsWith(`${serverUrl}:`)) {
            inflight.delete(key);
        }
    }
    for (const key of [...settleCallbacks.keys()]) {
        if (key.startsWith(`${serverUrl}:`)) {
            settleCallbacks.delete(key);
        }
    }
    conversationStore.removeServer(serverUrl);
}
