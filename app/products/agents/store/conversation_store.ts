// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchConversation} from '@agents/actions/remote/conversation';
import {useEffect, useMemo, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import type {ConversationResponse, Turn} from '@agents/types';

export interface ConversationState {
    conversation?: ConversationResponse;
    loading: boolean;
    error?: string;
}

const INITIAL_STATE: ConversationState = {loading: false};

/**
 * Coerce null turn.content to an empty array. The backend may persist a turn
 * whose content column is the JSON literal `null`; downstream iterates freely.
 */
function normalizeConversationResponse(raw: ConversationResponse): ConversationResponse {
    return {
        ...raw,
        turns: (raw.turns ?? []).map((turn) => ({
            ...turn,
            content: turn.content ?? [],
        })),
    };
}

/**
 * Ephemeral per-conversation cache. Stream-END invalidates entries so the next
 * subscriber re-fetches to pick up finalized turn data. Errors are cached so a
 * failed fetch doesn't retry on every render — an explicit invalidate is
 * required to retry.
 */
class ConversationStore {
    private subjects = new Map<string, BehaviorSubject<ConversationState>>();

    private inflight = new Map<string, Promise<void>>();

    private getSubject(conversationId: string): BehaviorSubject<ConversationState> {
        let subject = this.subjects.get(conversationId);
        if (!subject) {
            subject = new BehaviorSubject<ConversationState>(INITIAL_STATE);
            this.subjects.set(conversationId, subject);
        }
        return subject;
    }

    private fetch(serverUrl: string, conversationId: string): Promise<void> {
        const existing = this.inflight.get(conversationId);
        if (existing) {
            return existing;
        }

        const subject = this.getSubject(conversationId);
        subject.next({...subject.value, loading: true, error: undefined});

        const promise = fetchConversation(serverUrl, conversationId).then(({data, error}) => {
            this.inflight.delete(conversationId);
            if (error) {
                // Preserve the previously cached conversation on error as a
                // fail-safe so transient network failures (including those
                // triggered by invalidate) don't blank the UI. An explicit
                // evict() is required to drop cached data.
                subject.next({conversation: subject.value.conversation, loading: false, error});
                return;
            }
            subject.next({conversation: data && normalizeConversationResponse(data), loading: false});
        });

        this.inflight.set(conversationId, promise);
        return promise;
    }

    /** Load a conversation if it's not cached and no request is inflight. */
    ensure(serverUrl: string, conversationId: string): void {
        const subject = this.getSubject(conversationId);
        const {conversation, error, loading} = subject.value;
        if (conversation || error || loading) {
            return;
        }
        this.fetch(serverUrl, conversationId);
    }

    /** Force re-fetch of a specific conversation. */
    invalidate(serverUrl: string, conversationId: string): void {
        this.inflight.delete(conversationId);
        this.fetch(serverUrl, conversationId);
    }

    /** Drop a conversation's cache entry without re-fetching. */
    evict(conversationId: string): void {
        this.inflight.delete(conversationId);
        const subject = this.subjects.get(conversationId);
        if (subject) {
            subject.next(INITIAL_STATE);
        }
    }

    getState(conversationId: string): ConversationState {
        return this.subjects.get(conversationId)?.value ?? INITIAL_STATE;
    }

    observe(conversationId: string): Observable<ConversationState> {
        return this.getSubject(conversationId).asObservable();
    }

    /** Clear all cached conversations. Called on logout. */
    clear(): void {
        // Clear inflight first so a fetch resolving after this call does not
        // try to push state onto the now-completed subjects.
        this.inflight.clear();
        for (const subject of this.subjects.values()) {
            subject.next(INITIAL_STATE);
            subject.complete();
        }
        this.subjects.clear();
    }
}

const conversationStore = new ConversationStore();

/**
 * Subscribe to a conversation by id. Kicks off a fetch if the cache is empty,
 * dedups concurrent fetches, and re-runs whenever `invalidateConversation` is
 * called for this id.
 */
export function useConversation(serverUrl: string, conversationId?: string): ConversationState {
    const [state, setState] = useState<ConversationState>(() => (
        conversationId ? conversationStore.getState(conversationId) : INITIAL_STATE
    ));

    useEffect(() => {
        if (!conversationId) {
            setState(INITIAL_STATE);
            return undefined;
        }

        conversationStore.ensure(serverUrl, conversationId);
        const subscription = conversationStore.observe(conversationId).subscribe(setState);
        return () => subscription.unsubscribe();
    }, [serverUrl, conversationId]);

    return state;
}

/** Find the anchor turn whose post_id matches the given post. */
export function useTurnForPost(conversation: ConversationResponse | undefined, postId: string): Turn | undefined {
    return useMemo(() => {
        if (!conversation) {
            return undefined;
        }
        return conversation.turns.find((turn) => turn.post_id === postId);
    }, [conversation, postId]);
}

export function invalidateConversation(serverUrl: string, conversationId: string): void {
    conversationStore.invalidate(serverUrl, conversationId);
}

export function evictConversation(conversationId: string): void {
    conversationStore.evict(conversationId);
}

export function clearConversationCache(): void {
    conversationStore.clear();
}

export default conversationStore;
