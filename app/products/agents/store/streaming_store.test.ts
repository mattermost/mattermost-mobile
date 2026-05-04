// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CONTROL_SIGNALS} from '@agents/constants';
import {ToolCallStatus, type PostUpdateWebsocketMessage, type ToolCall, type Annotation, type StreamingState} from '@agents/types';

describe('StreamingPostStore', () => {
    let streamingStore: typeof import('./streaming_store').default;

    beforeEach(() => {
        jest.resetModules();
        streamingStore = require('./streaming_store').default;
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('startStreaming', () => {
        it('should create initial state with precontent true', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.postId).toBe(postId);
            expect(state?.generating).toBe(true);
            expect(state?.message).toBe('');
            expect(state?.precontent).toBe(true);
            expect(state?.reasoning).toBe('');
            expect(state?.isReasoningLoading).toBe(false);
            expect(state?.showReasoning).toBe(false);
            expect(state?.toolCalls).toEqual([]);
            expect(state?.annotations).toEqual([]);
        });

        it('should emit state to observers', () => {
            const postId = 'post123';
            const receivedStates: Array<StreamingState | undefined> = [];

            const subscription = streamingStore.observeStreamingState(postId).subscribe((state) => {
                receivedStates.push(state);
            });

            streamingStore.startStreaming(postId);

            // BehaviorSubject emits initial undefined, then the started state
            expect(receivedStates).toHaveLength(2);
            expect(receivedStates[0]).toBeUndefined();
            expect(receivedStates[1]).toMatchObject({
                postId,
                generating: true,
                message: '',
                precontent: true,
            });

            subscription.unsubscribe();
        });
    });

    describe('updateMessage', () => {
        it('should update message and set precontent to false', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.updateMessage(postId, 'Hello world');

            const state = streamingStore.getStreamingState(postId);
            expect(state?.message).toBe('Hello world');
            expect(state?.precontent).toBe(false);
            expect(state?.generating).toBe(true);
        });

        it('should emit updated state to observers', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const receivedStates: Array<StreamingState | undefined> = [];
            const subscription = streamingStore.observeStreamingState(postId).subscribe((state) => {
                receivedStates.push(state);
            });

            streamingStore.updateMessage(postId, 'Hello world');

            // First emission is current state (from subscribe), second is update
            expect(receivedStates).toHaveLength(2);
            expect(receivedStates[1]).toMatchObject({
                postId,
                message: 'Hello world',
                precontent: false,
                generating: true,
            });

            subscription.unsubscribe();
        });

        it('should create a generating state on the first message if start was missed', () => {
            // Covers WS reconnect mid-stream: the subscriber needs the message
            // even though the `start` control never reached this client.
            const postId = 'post123';
            streamingStore.updateMessage(postId, 'Hello world');

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.message).toBe('Hello world');
            expect(state?.generating).toBe(true);
            expect(state?.precontent).toBe(false);
        });
    });

    describe('endStreaming', () => {
        it('should preserve message but mark as not generating', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateMessage(postId, 'Hello world');

            streamingStore.endStreaming(postId);

            // State should be preserved with generating: false
            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.message).toBe('Hello world');
            expect(state?.generating).toBe(false);
            expect(state?.precontent).toBe(false);
            expect(state?.isReasoningLoading).toBe(false);
        });

        it('should emit preserved state and keep subject alive for reuse', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateMessage(postId, 'Hello world');

            const receivedStates: Array<StreamingState | undefined> = [];
            let completed = false;

            const subscription = streamingStore.observeStreamingState(postId).subscribe({
                next: (state) => receivedStates.push(state),
                complete: () => {
                    completed = true;
                },
            });

            streamingStore.endStreaming(postId);

            // Should receive current state on subscribe, then state with generating: false
            expect(receivedStates).toHaveLength(2);
            expect(receivedStates[1]).toMatchObject({
                postId,
                message: 'Hello world',
                generating: false,
            });

            // Subject should NOT complete - kept alive for potential reuse (regenerate)
            expect(completed).toBe(false);

            // Regenerate callers must clear state before re-starting so the
            // new stream doesn't inherit the previous response's message or
            // tools. See handleRegenerate in agent_post_new.tsx.
            streamingStore.removePost(postId);
            streamingStore.startStreaming(postId);
            expect(receivedStates[receivedStates.length - 1]).toMatchObject({postId, generating: true, precontent: true, message: ''});

            subscription.unsubscribe();
        });

        it('should do nothing if post is not streaming', () => {
            const postId = 'post123';

            // Should not throw
            expect(() => streamingStore.endStreaming(postId)).not.toThrow();
        });
    });

    describe('updateReasoning', () => {
        it('should update reasoning and set showReasoning to true', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.updateReasoning(postId, 'Analyzing the question...', true);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.reasoning).toBe('Analyzing the question...');
            expect(state?.isReasoningLoading).toBe(true);
            expect(state?.showReasoning).toBe(true);
        });

        it('should set generating to false when isLoading is true', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.updateReasoning(postId, 'Analyzing...', true);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.generating).toBe(false);
            expect(state?.precontent).toBe(false);
        });

        it('should preserve generating state when isLoading is false', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateMessage(postId, 'Some text');

            streamingStore.updateReasoning(postId, 'Reasoning complete', false);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.generating).toBe(true);
            expect(state?.isReasoningLoading).toBe(false);
        });

        it('should create state with reasoning flagged when the start event was missed', () => {
            const postId = 'post123';
            streamingStore.updateReasoning(postId, 'Reasoning', true);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.reasoning).toBe('Reasoning');
            expect(state?.showReasoning).toBe(true);
            expect(state?.isReasoningLoading).toBe(true);
        });
    });

    describe('updateToolCalls', () => {
        it('should parse JSON and update tool calls', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const toolCalls: ToolCall[] = [
                {
                    id: 'tool1',
                    name: 'search',
                    description: 'Search for information',
                    arguments: {query: 'test'},
                    status: ToolCallStatus.Pending,
                },
            ];

            streamingStore.updateToolCalls(postId, JSON.stringify(toolCalls));

            const state = streamingStore.getStreamingState(postId);
            expect(state?.toolCalls).toEqual(toolCalls);
            expect(state?.precontent).toBe(false);
        });

        it('should silently handle JSON parse errors', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.updateToolCalls(postId, 'invalid json');

            const state = streamingStore.getStreamingState(postId);
            expect(state?.toolCalls).toEqual([]);
        });

        it('should create minimal state if post is not streaming', () => {
            const postId = 'post123';
            streamingStore.updateToolCalls(postId, '[]');

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.toolCalls).toEqual([]);
            expect(state?.generating).toBe(false);
        });

        it('should merge additional tool rounds by id instead of replacing', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const round1: ToolCall[] = [
                {id: 'a', name: 'search', description: '', arguments: {q: 1}, status: ToolCallStatus.Pending},
            ];
            streamingStore.updateToolCalls(postId, JSON.stringify(round1));

            // Round 2 arrives with a new tool — server emits only this round's calls.
            const round2: ToolCall[] = [
                {id: 'b', name: 'read', description: '', arguments: {q: 2}, status: ToolCallStatus.Pending},
            ];
            streamingStore.updateToolCalls(postId, JSON.stringify(round2));

            const state = streamingStore.getStreamingState(postId);
            expect(state?.toolCalls.map((t) => t.id)).toEqual(['a', 'b']);
        });

        it('should preserve an early tool_call when start arrives second (WebSocket event race)', () => {
            const postId = 'post123';

            // tool_call arrives first because the server's tool_call broadcast
            // uses UserId scope while 'start' uses ChannelId scope; delivery
            // order at the client can flip.
            streamingStore.updateToolCalls(postId, JSON.stringify([
                {id: 'a', name: 'search', description: '', arguments: {}, status: ToolCallStatus.Pending},
            ]));

            // Then start arrives.
            streamingStore.startStreaming(postId);

            const state = streamingStore.getStreamingState(postId);

            // The early tool is preserved so the UI shows the approval card.
            expect(state?.toolCalls.map((t) => t.id)).toEqual(['a']);
            expect(state?.generating).toBe(true);
        });

        it('should update existing tools in place when a later event changes their status', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.updateToolCalls(postId, JSON.stringify([
                {id: 'a', name: 'search', description: '', arguments: {}, status: ToolCallStatus.Pending},
                {id: 'b', name: 'read', description: '', arguments: {}, status: ToolCallStatus.Pending},
            ]));

            // Status update for tool 'a' — should replace in place, preserving order.
            streamingStore.updateToolCalls(postId, JSON.stringify([
                {id: 'a', name: 'search', description: '', arguments: {}, status: ToolCallStatus.Success, result: 'ok'},
            ]));

            const state = streamingStore.getStreamingState(postId);
            expect(state?.toolCalls.map((t) => t.id)).toEqual(['a', 'b']);
            expect(state?.toolCalls[0].status).toBe(ToolCallStatus.Success);
            expect(state?.toolCalls[0].result).toBe('ok');
            expect(state?.toolCalls[1].status).toBe(ToolCallStatus.Pending);
        });
    });

    describe('updateAnnotations', () => {
        it('should parse JSON and update annotations', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const annotations: Annotation[] = [
                {
                    type: 'citation',
                    start_index: 0,
                    end_index: 10,
                    url: 'https://example.com',
                    title: 'Example',
                    index: 1,
                },
            ];

            streamingStore.updateAnnotations(postId, JSON.stringify(annotations));

            const state = streamingStore.getStreamingState(postId);
            expect(state?.annotations).toEqual(annotations);
            expect(state?.precontent).toBe(false);
        });

        it('should silently handle JSON parse errors', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.updateAnnotations(postId, 'invalid json');

            const state = streamingStore.getStreamingState(postId);
            expect(state?.annotations).toEqual([]);
        });

        it('should create state with annotations when the start event was missed', () => {
            const postId = 'post123';
            const annotations: Annotation[] = [
                {type: 'citation', start_index: 0, end_index: 1, url: 'https://a', title: 'A', index: 0},
            ];
            streamingStore.updateAnnotations(postId, JSON.stringify(annotations));

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.annotations).toEqual(annotations);
        });
    });

    describe('handleWebSocketMessage', () => {
        it('should handle START control signal', () => {
            const message: PostUpdateWebsocketMessage = {
                post_id: 'post123',
                control: CONTROL_SIGNALS.START,
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState('post123');
            expect(state).toBeDefined();
            expect(state?.generating).toBe(true);
            expect(state?.precontent).toBe(true);
        });

        it('should handle END control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateMessage(postId, 'Hello');

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.END,
            };

            streamingStore.handleWebSocketMessage(message);

            // State should be preserved with generating: false
            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.message).toBe('Hello');
            expect(state?.generating).toBe(false);
        });

        it('should handle CANCEL control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateMessage(postId, 'Hello');

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.CANCEL,
            };

            streamingStore.handleWebSocketMessage(message);

            // State should be preserved with generating: false
            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.message).toBe('Hello');
            expect(state?.generating).toBe(false);
        });

        it('should handle REASONING_SUMMARY control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.REASONING_SUMMARY,
                reasoning: 'Thinking step 1...',
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.reasoning).toBe('Thinking step 1...');
            expect(state?.isReasoningLoading).toBe(true);
            expect(state?.showReasoning).toBe(true);
            expect(state?.generating).toBe(false);
        });

        it('should handle REASONING_SUMMARY_DONE with reasoning text', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateReasoning(postId, 'Step 1', true);

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.REASONING_SUMMARY_DONE,
                reasoning: 'Final reasoning',
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.reasoning).toBe('Final reasoning');
            expect(state?.isReasoningLoading).toBe(false);
        });

        it('should handle REASONING_SUMMARY_DONE without reasoning text', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateReasoning(postId, 'Existing reasoning', true);

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.REASONING_SUMMARY_DONE,
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.reasoning).toBe('Existing reasoning');
            expect(state?.isReasoningLoading).toBe(false);
        });

        it('should handle TOOL_CALL control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const toolCalls: ToolCall[] = [
                {
                    id: 'tool1',
                    name: 'search',
                    description: 'Search',
                    arguments: {query: 'test'},
                    status: ToolCallStatus.Pending,
                },
            ];

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.TOOL_CALL,
                tool_call: JSON.stringify(toolCalls),
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.toolCalls).toEqual(toolCalls);
        });

        it('should handle ANNOTATIONS control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const annotations: Annotation[] = [
                {
                    type: 'citation',
                    start_index: 0,
                    end_index: 10,
                    url: 'https://example.com',
                    title: 'Example',
                    index: 1,
                },
            ];

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.ANNOTATIONS,
                annotations: JSON.stringify(annotations),
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.annotations).toEqual(annotations);
        });

        it('should handle message updates with next field', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                next: 'Hello from agent',
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.message).toBe('Hello from agent');
            expect(state?.precontent).toBe(false);
            expect(state?.generating).toBe(true);
        });

        it('should ignore messages without post_id', () => {
            const message: PostUpdateWebsocketMessage = {
                post_id: '',
                next: 'Hello',
            };

            streamingStore.handleWebSocketMessage(message);

            // Nothing should be created
            expect(streamingStore.getStreamingState('')).toBeUndefined();
        });
    });

    describe('observeStreamingState', () => {
        it('should emit current state immediately on subscribe', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            let receivedState: StreamingState | undefined;
            const subscription = streamingStore.observeStreamingState(postId).subscribe((state) => {
                receivedState = state;
            });

            expect(receivedState).toBeDefined();
            expect(receivedState?.postId).toBe(postId);

            subscription.unsubscribe();
        });

        it('should emit undefined for non-streaming post', () => {
            const postId = 'nonexistent';

            let receivedState: StreamingState | undefined = {postId: 'sentinel'} as StreamingState;
            const subscription = streamingStore.observeStreamingState(postId).subscribe((state) => {
                receivedState = state;
            });

            expect(receivedState).toBeUndefined();

            subscription.unsubscribe();
        });
    });

    describe('getStreamingState', () => {
        it('should return state for streaming post', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.postId).toBe(postId);
        });

        it('should return undefined for non-streaming post', () => {
            const state = streamingStore.getStreamingState('nonexistent');
            expect(state).toBeUndefined();
        });
    });

    describe('isStreaming', () => {
        it('should return true for streaming post', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            expect(streamingStore.isStreaming(postId)).toBe(true);
        });

        it('should return false for non-streaming post', () => {
            expect(streamingStore.isStreaming('nonexistent')).toBe(false);
        });
    });

    describe('removePost', () => {
        it('should remove streaming state and emit undefined', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            const receivedStates: Array<StreamingState | undefined> = [];
            const subscription = streamingStore.observeStreamingState(postId).subscribe((state) => {
                receivedStates.push(state);
            });

            streamingStore.removePost(postId);

            expect(streamingStore.getStreamingState(postId)).toBeUndefined();
            expect(receivedStates[receivedStates.length - 1]).toBeUndefined();

            subscription.unsubscribe();
        });

        it('should do nothing if post is not streaming', () => {
            const postId = 'post123';

            // Should not throw
            expect(() => streamingStore.removePost(postId)).not.toThrow();
        });
    });

    describe('clear', () => {
        it('should clear all streaming state', () => {
            streamingStore.startStreaming('post1');
            streamingStore.startStreaming('post2');
            streamingStore.startStreaming('post3');

            expect(streamingStore.isStreaming('post1')).toBe(true);
            expect(streamingStore.isStreaming('post2')).toBe(true);
            expect(streamingStore.isStreaming('post3')).toBe(true);

            streamingStore.clear();

            expect(streamingStore.isStreaming('post1')).toBe(false);
            expect(streamingStore.isStreaming('post2')).toBe(false);
            expect(streamingStore.isStreaming('post3')).toBe(false);
        });

        it('should complete all subscriptions', () => {
            streamingStore.startStreaming('post1');
            streamingStore.startStreaming('post2');

            let completedCount = 0;
            const sub1 = streamingStore.observeStreamingState('post1').subscribe({
                complete: () => completedCount++,
            });
            const sub2 = streamingStore.observeStreamingState('post2').subscribe({
                complete: () => completedCount++,
            });

            streamingStore.clear();

            expect(completedCount).toBe(2);

            sub1.unsubscribe();
            sub2.unsubscribe();
        });
    });

    describe('multiple concurrent streams', () => {
        it('should handle multiple posts streaming simultaneously', () => {
            streamingStore.startStreaming('post1');
            streamingStore.startStreaming('post2');
            streamingStore.updateMessage('post1', 'Message 1');
            streamingStore.updateMessage('post2', 'Message 2');

            const state1 = streamingStore.getStreamingState('post1');
            const state2 = streamingStore.getStreamingState('post2');

            expect(state1?.message).toBe('Message 1');
            expect(state2?.message).toBe('Message 2');
        });

        it('should handle ending one stream while others continue', () => {
            streamingStore.startStreaming('post1');
            streamingStore.startStreaming('post2');

            streamingStore.endStreaming('post1');

            expect(streamingStore.isStreaming('post1')).toBe(false);
            expect(streamingStore.isStreaming('post2')).toBe(true);
        });
    });
});
