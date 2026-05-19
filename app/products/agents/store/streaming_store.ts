// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import {CONTROL_SIGNALS} from '@agents/constants';
import {type StreamingState, type PostUpdateWebsocketMessage, type ToolCall} from '@agents/types';
import {logWarning} from '@utils/log';

// Ephemeral per-post streaming state, exposed reactively via RxJS.
class StreamingPostStore {
    private streamingSubjects: Map<string, BehaviorSubject<StreamingState | undefined>> = new Map();

    private getSubject(postId: string): BehaviorSubject<StreamingState | undefined> {
        let subject = this.streamingSubjects.get(postId);
        if (!subject) {
            subject = new BehaviorSubject<StreamingState | undefined>(undefined);
            this.streamingSubjects.set(postId, subject);
        }
        return subject;
    }

    // Preserve any early tool_call/annotation/text on `start` — events from
    // different WebSocket scopes can arrive before `start`, and wiping here
    // would drop pending-approval state. Regenerate paths clear state explicitly.
    startStreaming(postId: string): void {
        const existing = this.getStreamingState(postId);
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

        this.getSubject(postId).next(state);
    }

    // Used when an event arrives without a preceding `start` (reconnect mid-stream,
    // or a tool status update that lands after POST_EDITED cleared state).
    private makeDefaultState(postId: string): StreamingState {
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
    }

    updateMessage(postId: string, message: string): void {
        const state = this.getStreamingState(postId) ?? this.makeDefaultState(postId);

        this.getSubject(postId).next({
            ...state,
            message,
            precontent: false,
            generating: true,
        });
    }

    // Preserves message; POST_EDITED clears via removePost.
    endStreaming(postId: string): void {
        const state = this.getStreamingState(postId);
        if (!state) {
            return;
        }

        this.getSubject(postId).next({
            ...state,
            generating: false,
            precontent: false,
            isReasoningLoading: false,
        });
    }

    updateReasoning(postId: string, reasoning: string, isLoading: boolean): void {
        const state = this.getStreamingState(postId) ?? this.makeDefaultState(postId);

        // While reasoning, generating is false to suppress the blinking cursor.
        const generating = isLoading ? false : state.generating;
        const precontent = isLoading ? false : state.precontent;

        this.getSubject(postId).next({
            ...state,
            reasoning,
            isReasoningLoading: isLoading,
            showReasoning: true,
            generating,
            precontent,
        });
    }

    // Merge by id across rounds so the display retains earlier tools and
    // status transitions update in place without shuffling order.
    updateToolCalls(postId: string, toolCallsJson: string): void {
        const state = this.getStreamingState(postId) ?? this.makeDefaultState(postId);

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
            this.getSubject(postId).next({
                ...state,
                toolCalls: next,
                precontent: false,
            });
        } catch (error) {
            logWarning('[StreamingPostStore.updateToolCalls]', error, {postId, toolCallsJson});
        }
    }

    updateAnnotations(postId: string, annotationsJson: string): void {
        const state = this.getStreamingState(postId) ?? this.makeDefaultState(postId);

        try {
            const annotations = JSON.parse(annotationsJson);
            this.getSubject(postId).next({
                ...state,
                annotations,
                precontent: false,
            });
        } catch (error) {
            logWarning('[StreamingPostStore.updateAnnotations]', error, {postId, annotationsJson});
        }
    }

    handleWebSocketMessage(data: PostUpdateWebsocketMessage): void {
        const {post_id, next, control, reasoning, tool_call, annotations} = data;

        if (!post_id) {
            return;
        }

        // Handle control signals
        if (control === CONTROL_SIGNALS.START) {
            this.startStreaming(post_id);
            return;
        }

        if (control === CONTROL_SIGNALS.END || control === CONTROL_SIGNALS.CANCEL) {
            this.endStreaming(post_id);
            return;
        }

        // Handle reasoning summary updates
        if (control === CONTROL_SIGNALS.REASONING_SUMMARY && reasoning) {
            // Replace entire reasoning with accumulated text from backend
            this.updateReasoning(post_id, reasoning, true);
            return;
        }

        if (control === CONTROL_SIGNALS.REASONING_SUMMARY_DONE) {
            if (reasoning) {
                // updateReasoning falls back to a fresh state if `start` was
                // missed, so a reconnect that lands on DONE first still
                // captures the final reasoning text.
                this.updateReasoning(post_id, reasoning, false);
                return;
            }
            const state = this.getStreamingState(post_id);
            if (state) {
                this.getSubject(post_id).next({
                    ...state,
                    isReasoningLoading: false,
                });
            }
            return;
        }

        // Handle tool call events
        if (control === CONTROL_SIGNALS.TOOL_CALL && tool_call) {
            this.updateToolCalls(post_id, tool_call);
            return;
        }

        // Handle annotation events
        if (control === CONTROL_SIGNALS.ANNOTATIONS && annotations) {
            this.updateAnnotations(post_id, annotations);
            return;
        }

        // Handle message updates
        if (next) {
            // Message comes as full accumulated text, not delta
            this.updateMessage(post_id, next);
        }
    }

    getStreamingState(postId: string): StreamingState | undefined {
        return this.streamingSubjects.get(postId)?.value;
    }

    observeStreamingState(postId: string): Observable<StreamingState | undefined> {
        return this.getSubject(postId).asObservable();
    }

    isStreaming(postId: string): boolean {
        const state = this.getStreamingState(postId);
        return state?.generating ?? false;
    }

    // Called from POST_EDITED so the component switches from streaming state
    // to the persisted database row. Subject is kept for potential reuse.
    removePost(postId: string): void {
        const subject = this.streamingSubjects.get(postId);
        if (!subject) {
            return;
        }

        subject.next(undefined);
    }

    // Called on logout to drop every cached post.
    clear(): void {
        for (const subject of this.streamingSubjects.values()) {
            subject.next(undefined);
            subject.complete();
        }
        this.streamingSubjects.clear();
    }
}

const streamingStore = new StreamingPostStore();

export function useStreamingState(postId: string): StreamingState | undefined {
    const [state, setState] = useState<StreamingState | undefined>(
        () => streamingStore.getStreamingState(postId),
    );

    useEffect(() => {
        const subscription = streamingStore.observeStreamingState(postId).subscribe(setState);
        return () => subscription.unsubscribe();
    }, [postId]);

    return state;
}

export default streamingStore;
