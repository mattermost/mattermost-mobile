// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CONTROL_SIGNALS} from '@agents/constants';
import {type StreamingState, type PostUpdateWebsocketMessage} from '@agents/types';
import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import {logWarning} from '@utils/log';

/**
 * Ephemeral store for managing streaming post state
 * Uses RxJS BehaviorSubject for reactive state management
 */
class StreamingPostStore {
    private streamingSubjects: Map<string, BehaviorSubject<StreamingState | undefined>> = new Map();

    /**
     * Get or create a BehaviorSubject for a post
     */
    private getSubject(postId: string): BehaviorSubject<StreamingState | undefined> {
        let subject = this.streamingSubjects.get(postId);
        if (!subject) {
            subject = new BehaviorSubject<StreamingState | undefined>(undefined);
            this.streamingSubjects.set(postId, subject);
        }
        return subject;
    }

    /**
     * Start streaming for a post
     */
    startStreaming(postId: string): void {
        const state: StreamingState = {
            postId,
            generating: true,
            message: '',
            precontent: true, // Show "Starting..." state
            reasoning: '',
            isReasoningLoading: false,
            showReasoning: false,
            toolCalls: [],
            annotations: [],
        };

        this.getSubject(postId).next(state);
    }

    /**
     * Update the streaming message
     */
    updateMessage(postId: string, message: string): void {
        const state = this.getStreamingState(postId);
        if (!state) {
            return;
        }

        this.getSubject(postId).next({
            ...state,
            message,
            precontent: false,
            generating: true,
        });
    }

    /**
     * End streaming for a post
     * Preserves message but marks as done - POST_EDITED will call removePost to clear
     */
    endStreaming(postId: string): void {
        const state = this.getStreamingState(postId);
        if (!state) {
            return;
        }

        // Preserve message but mark as done - wait for POST_EDITED to clear via removePost
        this.getSubject(postId).next({
            ...state,
            generating: false,
            precontent: false,
            isReasoningLoading: false,
        });
    }

    /**
     * Update reasoning summary
     */
    updateReasoning(postId: string, reasoning: string, isLoading: boolean): void {
        const state = this.getStreamingState(postId);
        if (!state) {
            return;
        }

        // During reasoning, explicitly set generating to false to prevent blinking cursor
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

    /**
     * Update tool calls
     */
    updateToolCalls(postId: string, toolCallsJson: string): void {
        let state = this.getStreamingState(postId);

        // If no streaming state exists, create a minimal one for tool call updates
        // This handles tool status updates that arrive after streaming ends but before POST_EDITED
        if (!state) {
            state = {
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

        try {
            const toolCalls = JSON.parse(toolCallsJson);
            this.getSubject(postId).next({
                ...state,
                toolCalls,
                precontent: false,
            });
        } catch (error) {
            logWarning('[StreamingPostStore.updateToolCalls]', error, {postId, toolCallsJson});
        }
    }

    /**
     * Update annotations/citations
     */
    updateAnnotations(postId: string, annotationsJson: string): void {
        const state = this.getStreamingState(postId);
        if (!state) {
            return;
        }

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

    /**
     * Handle a WebSocket message
     */
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
            // Final reasoning text - mark as complete
            const state = this.getStreamingState(post_id);
            if (state && reasoning) {
                this.updateReasoning(post_id, reasoning, false);
            } else if (state) {
                // Just mark as done if no new reasoning text
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

    /**
     * Get the current streaming state for a post (synchronous)
     */
    getStreamingState(postId: string): StreamingState | undefined {
        return this.streamingSubjects.get(postId)?.value;
    }

    /**
     * Observe streaming state for a post (reactive)
     */
    observeStreamingState(postId: string): Observable<StreamingState | undefined> {
        return this.getSubject(postId).asObservable();
    }

    /**
     * Check if a post is currently streaming (actively generating)
     */
    isStreaming(postId: string): boolean {
        const state = this.getStreamingState(postId);
        return state?.generating ?? false;
    }

    /**
     * Remove streaming state for a specific post
     * Call this when a post is updated via POST_EDITED to ensure
     * the component uses the persisted data from the database
     */
    removePost(postId: string): void {
        const subject = this.streamingSubjects.get(postId);
        if (!subject) {
            return;
        }

        // Signal end to subscribers, but keep subject alive for potential reuse
        subject.next(undefined);
    }

    /**
     * Clear all streaming state (e.g., on logout)
     */
    clear(): void {
        // Complete all subjects before clearing
        for (const subject of this.streamingSubjects.values()) {
            subject.next(undefined);
            subject.complete();
        }
        this.streamingSubjects.clear();
    }
}

// Singleton instance
const streamingStore = new StreamingPostStore();

/**
 * React hook to subscribe to streaming state for a post
 */
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
