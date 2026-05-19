// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import {CONTROL_SIGNALS} from '@agents/constants';
import {type StreamingState, type PostUpdateWebsocketMessage, type ToolCall} from '@agents/types';
import {logWarning} from '@utils/log';

// Ephemeral per-post streaming state, scoped per server so two connected
// accounts can stream concurrently without aliasing on shared post ids.
class StreamingStoreSingleton {
    private streamingSubjects: {[serverUrl: string]: {[postId: string]: BehaviorSubject<StreamingState | undefined>}} = {};

    private getSubject = (serverUrl: string, postId: string): BehaviorSubject<StreamingState | undefined> => {
        if (!this.streamingSubjects[serverUrl]) {
            this.streamingSubjects[serverUrl] = {};
        }
        let subject = this.streamingSubjects[serverUrl][postId];
        if (!subject) {
            subject = new BehaviorSubject<StreamingState | undefined>(undefined);
            this.streamingSubjects[serverUrl][postId] = subject;
        }
        return subject;
    };

    // Preserve any early tool_call/annotation/text on `start` — events from
    // different WebSocket scopes can arrive before `start`, and wiping here
    // would drop pending-approval state. Regenerate paths clear state explicitly.
    startStreaming = (serverUrl: string, postId: string): void => {
        const existing = this.getStreamingState(serverUrl, postId);
        const hasEarlyContent = Boolean(
            existing && (
                existing.toolCalls.length > 0 ||
                existing.annotations.length > 0 ||
                existing.message !== '' ||
                existing.reasoning !== ''
            ),
        );

        const state: StreamingState = {
            postId,
            generating: true,
            message: existing?.message ?? '',
            precontent: !hasEarlyContent,
            reasoning: existing?.reasoning ?? '',
            isReasoningLoading: existing?.isReasoningLoading ?? false,
            showReasoning: existing?.showReasoning ?? false,
            toolCalls: existing?.toolCalls ?? [],
            annotations: existing?.annotations ?? [],
        };

        this.getSubject(serverUrl, postId).next(state);
    };

    // Used when an event arrives without a preceding `start` (reconnect mid-stream,
    // or a tool status update that lands after POST_EDITED cleared state).
    private makeDefaultState = (postId: string): StreamingState => {
        return {
            postId,
            generating: false,
            message: '',
            precontent: false,
            reasoning: '',
            isReasoningLoading: false,
            showReasoning: false,
            toolCalls: [],
            annotations: [],
        };
    };

    updateMessage = (serverUrl: string, postId: string, message: string): void => {
        const state = this.getStreamingState(serverUrl, postId) ?? this.makeDefaultState(postId);

        this.getSubject(serverUrl, postId).next({
            ...state,
            message,
            precontent: false,
            generating: true,
        });
    };

    // Preserves message; POST_EDITED clears via removePost.
    endStreaming = (serverUrl: string, postId: string): void => {
        const state = this.getStreamingState(serverUrl, postId);
        if (!state) {
            return;
        }

        this.getSubject(serverUrl, postId).next({
            ...state,
            generating: false,
            precontent: false,
            isReasoningLoading: false,
        });
    };

    updateReasoning = (serverUrl: string, postId: string, reasoning: string, isLoading: boolean): void => {
        const state = this.getStreamingState(serverUrl, postId) ?? this.makeDefaultState(postId);

        // While reasoning, generating is false to suppress the blinking cursor.
        const generating = isLoading ? false : state.generating;
        const precontent = isLoading ? false : state.precontent;

        this.getSubject(serverUrl, postId).next({
            ...state,
            reasoning,
            isReasoningLoading: isLoading,
            showReasoning: true,
            generating,
            precontent,
        });
    };

    // Merge by id across rounds so the display retains earlier tools and
    // status transitions update in place without shuffling order.
    updateToolCalls = (serverUrl: string, postId: string, toolCallsJson: string): void => {
        const state = this.getStreamingState(serverUrl, postId) ?? this.makeDefaultState(postId);

        try {
            const parsedToolCalls = JSON.parse(toolCallsJson) as ToolCall[];
            const byId = new Map<string, number>();
            const next = [...state.toolCalls];
            for (let i = 0; i < next.length; i++) {
                byId.set(next[i].id, i);
            }
            for (const tc of parsedToolCalls) {
                const idx = byId.get(tc.id);
                if (idx === undefined) {
                    byId.set(tc.id, next.length);
                    next.push(tc);
                } else {
                    next[idx] = tc;
                }
            }
            this.getSubject(serverUrl, postId).next({
                ...state,
                toolCalls: next,
                precontent: false,
            });
        } catch (error) {
            logWarning('[StreamingStoreSingleton.updateToolCalls]', error, {serverUrl, postId, toolCallsJson});
        }
    };

    updateAnnotations = (serverUrl: string, postId: string, annotationsJson: string): void => {
        const state = this.getStreamingState(serverUrl, postId) ?? this.makeDefaultState(postId);

        try {
            const annotations = JSON.parse(annotationsJson);
            this.getSubject(serverUrl, postId).next({
                ...state,
                annotations,
                precontent: false,
            });
        } catch (error) {
            logWarning('[StreamingStoreSingleton.updateAnnotations]', error, {serverUrl, postId, annotationsJson});
        }
    };

    handleWebSocketMessage = (serverUrl: string, data: PostUpdateWebsocketMessage): void => {
        const {post_id, next, control, reasoning, tool_call, annotations} = data;

        if (!post_id) {
            return;
        }

        // Handle control signals
        if (control === CONTROL_SIGNALS.START) {
            this.startStreaming(serverUrl, post_id);
            return;
        }

        if (control === CONTROL_SIGNALS.END || control === CONTROL_SIGNALS.CANCEL) {
            this.endStreaming(serverUrl, post_id);
            return;
        }

        // Handle reasoning summary updates
        if (control === CONTROL_SIGNALS.REASONING_SUMMARY && reasoning) {
            // Replace entire reasoning with accumulated text from backend
            this.updateReasoning(serverUrl, post_id, reasoning, true);
            return;
        }

        if (control === CONTROL_SIGNALS.REASONING_SUMMARY_DONE) {
            if (reasoning) {
                // updateReasoning falls back to a fresh state if `start` was
                // missed, so a reconnect that lands on DONE first still
                // captures the final reasoning text.
                this.updateReasoning(serverUrl, post_id, reasoning, false);
                return;
            }
            const state = this.getStreamingState(serverUrl, post_id);
            if (state) {
                this.getSubject(serverUrl, post_id).next({
                    ...state,
                    isReasoningLoading: false,
                });
            }
            return;
        }

        // Handle tool call events
        if (control === CONTROL_SIGNALS.TOOL_CALL && tool_call) {
            this.updateToolCalls(serverUrl, post_id, tool_call);
            return;
        }

        // Handle annotation events
        if (control === CONTROL_SIGNALS.ANNOTATIONS && annotations) {
            this.updateAnnotations(serverUrl, post_id, annotations);
            return;
        }

        // Handle message updates
        if (next) {
            // Message comes as full accumulated text, not delta
            this.updateMessage(serverUrl, post_id, next);
        }
    };

    getStreamingState = (serverUrl: string, postId: string): StreamingState | undefined => {
        return this.streamingSubjects[serverUrl]?.[postId]?.value;
    };

    observeStreamingState = (serverUrl: string, postId: string): Observable<StreamingState | undefined> => {
        return this.getSubject(serverUrl, postId).asObservable();
    };

    isStreaming = (serverUrl: string, postId: string): boolean => {
        const state = this.getStreamingState(serverUrl, postId);
        return state?.generating ?? false;
    };

    // Called from POST_EDITED so the component switches from streaming state
    // to the persisted database row. Subject is kept for potential reuse.
    removePost = (serverUrl: string, postId: string): void => {
        const subject = this.streamingSubjects[serverUrl]?.[postId];
        if (!subject) {
            return;
        }

        subject.next(undefined);
    };

    // Drop every streaming subject for one server. Called on per-server logout.
    removeServer = (serverUrl: string): void => {
        const inner = this.streamingSubjects[serverUrl];
        if (!inner) {
            return;
        }
        for (const subject of Object.values(inner)) {
            subject.next(undefined);
            subject.complete();
        }
        delete this.streamingSubjects[serverUrl];
    };

    // Drop every cached subject across every server (test reset / full logout).
    clear = (): void => {
        for (const serverUrl of Object.keys(this.streamingSubjects)) {
            this.removeServer(serverUrl);
        }
    };
}

const streamingStore = new StreamingStoreSingleton();

export function useStreamingState(serverUrl: string, postId: string): StreamingState | undefined {
    const [state, setState] = useState<StreamingState | undefined>(
        () => streamingStore.getStreamingState(serverUrl, postId),
    );

    useEffect(() => {
        const subscription = streamingStore.observeStreamingState(serverUrl, postId).subscribe(setState);
        return () => subscription.unsubscribe();
    }, [serverUrl, postId]);

    return state;
}

export default streamingStore;
