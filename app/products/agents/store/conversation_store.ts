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

// Ephemeral per-conversation cache. Errors are cached so a failed fetch
// doesn't retry on every render — invalidate() or evict() to retry.
class ConversationStore {
    private subjects = new Map<string, BehaviorSubject<ConversationState>>();

    private inflight = new Map<string, Promise<void>>();

    // Track which server each conversation was fetched from so we can evict
    // only the conversations belonging to a specific server on logout.
    private serverMap = new Map<string, string>();

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

        this.serverMap.set(conversationId, serverUrl);

        const subject = this.getSubject(conversationId);
        subject.next({...subject.value, loading: true, error: undefined});

        const promise = fetchConversation(serverUrl, conversationId).then(({data, error}) => {
            this.inflight.delete(conversationId);
            if (error) {
                // Preserve cached data on error so transient failures don't
                // blank the UI; evict() is required to drop it.
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
        this.serverMap.delete(conversationId);
        const subject = this.subjects.get(conversationId);
        if (subject) {
            subject.next(INITIAL_STATE);
        }
    }

    /** Evict all conversations that belong to a specific server. */
    clearForServer(serverUrl: string): void {
        for (const [conversationId, url] of this.serverMap) {
            if (url === serverUrl) {
                this.evict(conversationId);
            }
        }
    }

    getState(conversationId: string): ConversationState {
        return this.subjects.get(conversationId)?.value ?? INITIAL_STATE;
    }

    observe(conversationId: string): Observable<ConversationState> {
        return this.getSubject(conversationId).asObservable();
    }

    // Called on full logout to drop every cached conversation across all servers.
    clear(): void {
        // Clear inflight first so resolutions land on still-active subjects.
        this.inflight.clear();
        this.serverMap.clear();
        for (const subject of this.subjects.values()) {
            subject.next(INITIAL_STATE);
            subject.complete();
        }
        this.subjects.clear();
    }
}

const conversationStore = new ConversationStore();

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

export function clearConversationCacheForServer(serverUrl: string): void {
    conversationStore.clearForServer(serverUrl);
}

export function clearConversationCache(): void {
    conversationStore.clear();
}

export default conversationStore;
