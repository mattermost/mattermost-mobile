// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import {ensureConversation} from '@agents/actions/remote/conversation';

import type {ConversationResponse, Turn} from '@agents/types';

export interface ConversationState {
    conversation?: ConversationResponse;
    loading: boolean;
    error?: string;
}

export const INITIAL_CONVERSATION_STATE: ConversationState = {loading: false};

// Passive per-server, per-id conversation cache. The action layer
// (`@agents/actions/remote/conversation`) owns fetching, dedup, and writes
// into this store via `setState`.
class ConversationStoreSingleton {
    private subjects: {[serverUrl: string]: {[id: string]: BehaviorSubject<ConversationState>}} = {};

    private getSubject = (serverUrl: string, id: string): BehaviorSubject<ConversationState> => {
        if (!this.subjects[serverUrl]) {
            this.subjects[serverUrl] = {};
        }
        let subject = this.subjects[serverUrl][id];
        if (!subject) {
            subject = new BehaviorSubject<ConversationState>(INITIAL_CONVERSATION_STATE);
            this.subjects[serverUrl][id] = subject;
        }
        return subject;
    };

    setState = (serverUrl: string, id: string, state: ConversationState): void => {
        this.getSubject(serverUrl, id).next(state);
    };

    getState = (serverUrl: string, id: string): ConversationState => {
        return this.subjects[serverUrl]?.[id]?.value ?? INITIAL_CONVERSATION_STATE;
    };

    observe = (serverUrl: string, id: string): Observable<ConversationState> => {
        return this.getSubject(serverUrl, id).asObservable();
    };

    /** Drop a single conversation entry without re-fetching. */
    evict = (serverUrl: string, id: string): void => {
        const subject = this.subjects[serverUrl]?.[id];
        if (subject) {
            subject.next(INITIAL_CONVERSATION_STATE);
        }
    };

    /** Drop every conversation belonging to one server. Called on per-server logout. */
    removeServer = (serverUrl: string): void => {
        const inner = this.subjects[serverUrl];
        if (!inner) {
            return;
        }
        for (const subject of Object.values(inner)) {
            subject.next(INITIAL_CONVERSATION_STATE);
            subject.complete();
        }
        delete this.subjects[serverUrl];
    };

    /** Full reset across all servers (test cleanup / full logout). */
    clear = (): void => {
        for (const serverUrl of Object.keys(this.subjects)) {
            this.removeServer(serverUrl);
        }
    };
}

const conversationStore = new ConversationStoreSingleton();

export function useConversation(serverUrl: string, conversationId?: string): ConversationState {
    const [state, setState] = useState<ConversationState>(() => (
        conversationId ? conversationStore.getState(serverUrl, conversationId) : INITIAL_CONVERSATION_STATE
    ));

    useEffect(() => {
        if (!conversationId) {
            setState(INITIAL_CONVERSATION_STATE);
            return undefined;
        }

        ensureConversation(serverUrl, conversationId);
        const subscription = conversationStore.observe(serverUrl, conversationId).subscribe(setState);
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

export default conversationStore;
