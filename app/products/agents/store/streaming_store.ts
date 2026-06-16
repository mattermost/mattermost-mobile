// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import {CONTROL_SIGNALS} from '@agents/constants';
import {ToolCallStatus, type StreamingState, type PostUpdateWebsocketMessage, type Round, type ToolCall} from '@agents/types';
import {logDebug, logWarning} from '@utils/log';

// A round resolves once every tool in the current round reaches a terminal
// status; that event is the boundary where we snapshot the round and start the
// next one. Mirrors the webapp isResolvedToolCallEvent.
function isResolvedToolCallEvent(toolCalls: ToolCall[]): boolean {
    if (toolCalls.length === 0) {
        return false;
    }
    return toolCalls.every((tc) =>
        tc.status === ToolCallStatus.Success ||
        tc.status === ToolCallStatus.Error ||
        tc.status === ToolCallStatus.AutoApproved ||
        tc.status === ToolCallStatus.Rejected,
    );
}

// Merge incoming tool calls into the existing list by id: update in place when
// the id is known (status transitions), append when new, preserving order.
// Named distinctly from the unrelated `mergeToolCalls` in @agents/utils (which
// merges public + private redaction data) to avoid conflating the two.
function mergeToolCallsById(existing: ToolCall[], incoming: ToolCall[]): ToolCall[] {
    const byId = new Map<string, number>();
    const merged = [...existing];
    for (let i = 0; i < merged.length; i++) {
        byId.set(merged[i].id, i);
    }
    for (const tc of incoming) {
        const idx = byId.get(tc.id);
        if (idx === undefined) {
            byId.set(tc.id, merged.length);
            merged.push(tc);
        } else {
            merged[idx] = tc;
        }
    }
    return merged;
}

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
                existing.rounds.length > 0 ||
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
            rounds: existing?.rounds ?? [],
            stopped: false,
            continueSeq: existing?.continueSeq ?? 0,
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
            rounds: [],
            stopped: false,
            continueSeq: 0,
        };
    };

    // Tool-approval resume: the prior round is already persisted server-side
    // (it returns via the conversation refetch the component triggers off
    // continueSeq), so clear every live buffer to avoid double-rendering it.
    private continueStreaming = (serverUrl: string, postId: string): void => {
        const existing = this.getStreamingState(serverUrl, postId);
        this.getSubject(serverUrl, postId).next({
            postId,
            generating: true,
            message: '',
            precontent: true,
            reasoning: '',
            isReasoningLoading: false,
            showReasoning: false,
            toolCalls: [],
            annotations: [],
            rounds: [],
            stopped: false,
            continueSeq: (existing?.continueSeq ?? 0) + 1,
        });
    };

    // Set when the user taps Stop so late streaming events (message text,
    // reasoning, tool calls, annotations) are ignored until the next
    // start/cancel/end/continue. Mirrors the webapp stopped flag.
    markStopped = (serverUrl: string, postId: string): void => {
        const state = this.getStreamingState(serverUrl, postId);
        if (!state) {
            logDebug('[StreamingStoreSingleton.markStopped] no streaming state', {serverUrl, postId});
            return;
        }

        this.getSubject(serverUrl, postId).next({
            ...state,
            stopped: true,
            generating: false,
            isReasoningLoading: false,
        });
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
            stopped: false,
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

    // Merge by id so status transitions update in place, then detect the round
    // boundary: when every tool in the current round is terminal, snapshot the
    // round (its text + reasoning + tools + annotations) into `rounds` and reset
    // the live buffers so the next round renders as its own segment.
    updateToolCalls = (serverUrl: string, postId: string, toolCallsJson: string): void => {
        const state = this.getStreamingState(serverUrl, postId) ?? this.makeDefaultState(postId);

        try {
            const parsedToolCalls = JSON.parse(toolCallsJson) as ToolCall[];
            const merged = mergeToolCallsById(state.toolCalls, parsedToolCalls);

            if (isResolvedToolCallEvent(merged)) {
                const round: Round = {
                    id: `live-${state.rounds.length}`,
                    text: state.message,
                    toolCalls: merged,
                    reasoning: {summary: state.reasoning, signature: ''},
                    annotations: state.annotations,
                };
                this.getSubject(serverUrl, postId).next({
                    ...state,
                    rounds: [...state.rounds, round],
                    message: '',
                    reasoning: '',
                    isReasoningLoading: false,
                    showReasoning: false,
                    toolCalls: [],
                    annotations: [],
                    precontent: false,
                });
                return;
            }

            this.getSubject(serverUrl, postId).next({
                ...state,
                toolCalls: merged,
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

        if (control === CONTROL_SIGNALS.CONTINUE) {
            this.continueStreaming(serverUrl, post_id);
            return;
        }

        // Once the user taps Stop, ignore every late content event (reasoning,
        // tool calls, annotations, message text) until one of the control
        // signals handled above clears the stopped flag.
        if (this.getStreamingState(serverUrl, post_id)?.stopped) {
            logDebug('[StreamingStoreSingleton.handleWebSocketMessage] ignoring event while stopped', {serverUrl, postId: post_id, control});
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
