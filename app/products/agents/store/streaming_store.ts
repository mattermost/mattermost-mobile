// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CONTROL_SIGNALS} from '@agents/constants';
import {StreamingEvents, type StreamingState, type PostUpdateWebsocketMessage} from '@agents/types';
import {DeviceEventEmitter} from 'react-native';

/**
 * Ephemeral store for managing streaming post state
 * Similar to typing indicators - state exists only while streaming
 */
class StreamingPostStore {
    private streamingPosts: Map<string, StreamingState> = new Map();

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
        };

        this.streamingPosts.set(postId, state);
        this.emitEvent(StreamingEvents.STARTED, state);
    }

    /**
     * Update the streaming message
     */
    updateMessage(postId: string, message: string): void {
        const state = this.streamingPosts.get(postId);
        if (!state) {
            return;
        }

        state.message = message;
        state.precontent = false;
        state.generating = true;

        this.emitEvent(StreamingEvents.UPDATED, state);
    }

    /**
     * End streaming for a post
     */
    endStreaming(postId: string): void {
        const state = this.streamingPosts.get(postId);
        if (!state) {
            return;
        }

        state.generating = false;
        state.precontent = false;

        this.emitEvent(StreamingEvents.ENDED, state);

        // Clean up after a short delay to allow final render
        setTimeout(() => {
            this.streamingPosts.delete(postId);
        }, 500);
    }

    /**
     * Update reasoning summary
     */
    updateReasoning(postId: string, reasoning: string, isLoading: boolean): void {
        const state = this.streamingPosts.get(postId);
        if (!state) {
            return;
        }

        state.reasoning = reasoning;
        state.isReasoningLoading = isLoading;
        state.showReasoning = true;

        // During reasoning, explicitly set generating to false to prevent blinking cursor
        if (isLoading) {
            state.generating = false;
            state.precontent = false;
        }

        this.emitEvent(StreamingEvents.UPDATED, state);
    }

    /**
     * Update tool calls
     */
    updateToolCalls(postId: string, toolCallsJson: string): void {
        const state = this.streamingPosts.get(postId);
        if (!state) {
            return;
        }

        try {
            state.toolCalls = JSON.parse(toolCallsJson);
            state.precontent = false;
            this.emitEvent(StreamingEvents.UPDATED, state);
        } catch (error) {
            // Silently handle JSON parse errors
        }
    }

    /**
     * Handle a WebSocket message
     */
    handleWebSocketMessage(data: PostUpdateWebsocketMessage): void {
        const {post_id, next, control, reasoning, tool_call} = data;

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
            const state = this.streamingPosts.get(post_id);
            if (state && reasoning) {
                this.updateReasoning(post_id, reasoning, false);
            } else if (state) {
                // Just mark as done if no new reasoning text
                state.isReasoningLoading = false;
                this.emitEvent(StreamingEvents.UPDATED, state);
            }
            return;
        }

        // Handle tool call events
        if (control === CONTROL_SIGNALS.TOOL_CALL && tool_call) {
            this.updateToolCalls(post_id, tool_call);
            return;
        }

        // Handle message updates
        if (next) {
            // Message comes as full accumulated text, not delta
            this.updateMessage(post_id, next);
        }
    }

    /**
     * Get the current streaming state for a post
     */
    getStreamingState(postId: string): StreamingState | undefined {
        return this.streamingPosts.get(postId);
    }

    /**
     * Check if a post is currently streaming
     */
    isStreaming(postId: string): boolean {
        return this.streamingPosts.has(postId);
    }

    /**
     * Emit an event for UI updates
     */
    private emitEvent(event: StreamingEvents, state: StreamingState): void {
        DeviceEventEmitter.emit(event, {
            postId: state.postId,
            generating: state.generating,
            message: state.message,
            precontent: state.precontent,
            reasoning: state.reasoning,
            isReasoningLoading: state.isReasoningLoading,
            showReasoning: state.showReasoning,
            toolCalls: state.toolCalls,
        });

        // Also emit a generic update event with the post ID
        DeviceEventEmitter.emit(`${event}_${state.postId}`, state);
    }

    /**
     * Clear all streaming state (e.g., on logout)
     */
    clear(): void {
        this.streamingPosts.clear();
    }
}

// Export singleton instance
export default new StreamingPostStore();
