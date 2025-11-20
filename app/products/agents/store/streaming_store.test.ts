// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CONTROL_SIGNALS} from '@agents/constants';
import {StreamingEvents, ToolCallStatus, type PostUpdateWebsocketMessage, type ToolCall, type Annotation} from '@agents/types';

// Mock react-native
const mockEmit = jest.fn();
jest.mock('react-native', () => ({
    DeviceEventEmitter: {
        emit: mockEmit,
    },
}));

describe('StreamingPostStore', () => {
    let streamingStore: typeof import('./streaming_store').default;

    beforeEach(() => {
        jest.resetModules();
        mockEmit.mockClear();
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

        it('should emit STARTED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.STARTED,
                expect.objectContaining({
                    postId,
                    generating: true,
                    message: '',
                    precontent: true,
                }),
            );
        });

        it('should emit post-specific STARTED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            expect(mockEmit).toHaveBeenCalledWith(
                `${StreamingEvents.STARTED}_${postId}`,
                expect.objectContaining({postId}),
            );
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

        it('should emit UPDATED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.updateMessage(postId, 'Hello world');

            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.UPDATED,
                expect.objectContaining({
                    postId,
                    message: 'Hello world',
                    precontent: false,
                    generating: true,
                }),
            );
        });

        it('should emit post-specific UPDATED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.updateMessage(postId, 'Hello world');

            expect(mockEmit).toHaveBeenCalledWith(
                `${StreamingEvents.UPDATED}_${postId}`,
                expect.objectContaining({
                    postId,
                    message: 'Hello world',
                }),
            );
        });

        it('should do nothing if post is not streaming', () => {
            const postId = 'post123';
            streamingStore.updateMessage(postId, 'Hello world');

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeUndefined();
            expect(mockEmit).not.toHaveBeenCalled();
        });
    });

    describe('endStreaming', () => {
        beforeEach(() => {
            jest.useFakeTimers({doNotFake: ['nextTick']});
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should clean up state immediately', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);

            streamingStore.endStreaming(postId);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeUndefined();
        });

        it('should emit ENDED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.endStreaming(postId);

            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.ENDED,
                expect.objectContaining({
                    postId,
                    generating: false,
                }),
            );
        });

        it('should emit post-specific ENDED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.endStreaming(postId);

            expect(mockEmit).toHaveBeenCalledWith(
                `${StreamingEvents.ENDED}_${postId}`,
                expect.objectContaining({
                    postId,
                    generating: false,
                }),
            );
        });

        it('should do nothing if post is not streaming', () => {
            const postId = 'post123';
            streamingStore.endStreaming(postId);

            expect(mockEmit).not.toHaveBeenCalled();
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

        it('should not set generating to false when isLoading is false', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            streamingStore.updateMessage(postId, 'Some text');

            streamingStore.updateReasoning(postId, 'Reasoning complete', false);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.generating).toBe(true);
            expect(state?.isReasoningLoading).toBe(false);
        });

        it('should emit UPDATED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.updateReasoning(postId, 'Analyzing...', true);

            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.UPDATED,
                expect.objectContaining({
                    postId,
                    reasoning: 'Analyzing...',
                    isReasoningLoading: true,
                    showReasoning: true,
                }),
            );
        });

        it('should do nothing if post is not streaming', () => {
            const postId = 'post123';
            streamingStore.updateReasoning(postId, 'Reasoning', true);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeUndefined();
            expect(mockEmit).not.toHaveBeenCalled();
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

        it('should emit UPDATED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            const toolCalls: ToolCall[] = [
                {
                    id: 'tool1',
                    name: 'search',
                    description: 'Search',
                    arguments: {},
                    status: ToolCallStatus.Pending,
                },
            ];

            streamingStore.updateToolCalls(postId, JSON.stringify(toolCalls));

            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.UPDATED,
                expect.objectContaining({
                    postId,
                    toolCalls,
                }),
            );
        });

        it('should silently handle JSON parse errors', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.updateToolCalls(postId, 'invalid json');

            const state = streamingStore.getStreamingState(postId);
            expect(state?.toolCalls).toEqual([]);
            expect(mockEmit).not.toHaveBeenCalled();
        });

        it('should create minimal state if post is not streaming', () => {
            const postId = 'post123';
            streamingStore.updateToolCalls(postId, '[]');

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeDefined();
            expect(state?.toolCalls).toEqual([]);
            expect(state?.generating).toBe(false);
            expect(mockEmit).toHaveBeenCalled();
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

        it('should emit UPDATED event', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

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

            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.UPDATED,
                expect.objectContaining({
                    postId,
                    annotations,
                }),
            );
        });

        it('should silently handle JSON parse errors', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            streamingStore.updateAnnotations(postId, 'invalid json');

            const state = streamingStore.getStreamingState(postId);
            expect(state?.annotations).toEqual([]);
            expect(mockEmit).not.toHaveBeenCalled();
        });

        it('should do nothing if post is not streaming', () => {
            const postId = 'post123';
            streamingStore.updateAnnotations(postId, '[]');

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeUndefined();
            expect(mockEmit).not.toHaveBeenCalled();
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
            jest.useFakeTimers({doNotFake: ['nextTick']});

            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.END,
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeUndefined();
            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.ENDED,
                expect.objectContaining({postId}),
            );

            jest.useRealTimers();
        });

        it('should handle CANCEL control signal', () => {
            jest.useFakeTimers({doNotFake: ['nextTick']});

            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.CANCEL,
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state).toBeUndefined();
            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.ENDED,
                expect.objectContaining({postId}),
            );

            jest.useRealTimers();
        });

        it('should handle REASONING_SUMMARY control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

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
            mockEmit.mockClear();

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
            mockEmit.mockClear();

            const message: PostUpdateWebsocketMessage = {
                post_id: postId,
                control: CONTROL_SIGNALS.REASONING_SUMMARY_DONE,
            };

            streamingStore.handleWebSocketMessage(message);

            const state = streamingStore.getStreamingState(postId);
            expect(state?.reasoning).toBe('Existing reasoning');
            expect(state?.isReasoningLoading).toBe(false);
            expect(mockEmit).toHaveBeenCalledWith(
                StreamingEvents.UPDATED,
                expect.objectContaining({
                    postId,
                    isReasoningLoading: false,
                }),
            );
        });

        it('should handle TOOL_CALL control signal', () => {
            const postId = 'post123';
            streamingStore.startStreaming(postId);
            mockEmit.mockClear();

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
            mockEmit.mockClear();

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
            mockEmit.mockClear();

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

            expect(mockEmit).not.toHaveBeenCalled();
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
            jest.useFakeTimers({doNotFake: ['nextTick']});

            streamingStore.startStreaming('post1');
            streamingStore.startStreaming('post2');

            streamingStore.endStreaming('post1');
            jest.advanceTimersByTime(500);

            expect(streamingStore.isStreaming('post1')).toBe(false);
            expect(streamingStore.isStreaming('post2')).toBe(true);

            jest.useRealTimers();
        });
    });
});
