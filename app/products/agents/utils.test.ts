// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENT_POST_TYPES} from '@agents/constants';
import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';

import TestHelper from '@test/test_helper';

import {isAgentPost, isPostRequester, isToolCallRedacted, isPendingToolResult, getToolApprovalStage, mergeToolCalls} from './utils';

describe('isAgentPost', () => {
    describe('with Post objects', () => {
        it('returns true when post type is custom_llmbot', () => {
            const post = TestHelper.fakePost({type: AGENT_POST_TYPES.LLMBOT});
            expect(isAgentPost(post)).toBe(true);
        });

        it('returns true when post type is custom_llm_postback', () => {
            const post = TestHelper.fakePost({type: AGENT_POST_TYPES.LLM_POSTBACK});
            expect(isAgentPost(post)).toBe(true);
        });

        it('returns false for non-agent post types', () => {
            const post = TestHelper.fakePost({type: ''});
            expect(isAgentPost(post)).toBe(false);

            const systemPost = TestHelper.fakePost({type: 'system_join_channel'});
            expect(isAgentPost(systemPost)).toBe(false);
        });
    });

    describe('with PostModel objects', () => {
        it('returns true when post type is custom_llmbot', () => {
            const postModel = TestHelper.fakePostModel({type: AGENT_POST_TYPES.LLMBOT});
            expect(isAgentPost(postModel)).toBe(true);
        });

        it('returns true when post type is custom_llm_postback', () => {
            const postModel = TestHelper.fakePostModel({type: AGENT_POST_TYPES.LLM_POSTBACK});
            expect(isAgentPost(postModel)).toBe(true);
        });

        it('returns false for non-agent post types', () => {
            const postModel = TestHelper.fakePostModel({type: ''});
            expect(isAgentPost(postModel)).toBe(false);
        });
    });
});

describe('isPostRequester', () => {
    const currentUserId = 'user123';

    describe('with Post objects', () => {
        it('returns true when llm_requester_user_id matches current user ID', () => {
            const post = TestHelper.fakePost({
                props: {
                    llm_requester_user_id: currentUserId,
                },
            });
            expect(isPostRequester(post, currentUserId)).toBe(true);
        });

        it('returns false when llm_requester_user_id does not match', () => {
            const post = TestHelper.fakePost({
                props: {
                    llm_requester_user_id: 'different_user',
                },
            });
            expect(isPostRequester(post, currentUserId)).toBe(false);
        });

        it('returns false when props is undefined', () => {
            const post = TestHelper.fakePost({
                props: undefined,
            });
            expect(isPostRequester(post, currentUserId)).toBe(false);
        });

        it('returns false when props is empty object', () => {
            const post = TestHelper.fakePost({
                props: {},
            });
            expect(isPostRequester(post, currentUserId)).toBe(false);
        });

        it('returns false when llm_requester_user_id is missing', () => {
            const post = TestHelper.fakePost({
                props: {
                    some_other_prop: 'value',
                },
            });
            expect(isPostRequester(post, currentUserId)).toBe(false);
        });
    });

    describe('with PostModel objects', () => {
        it('returns true when llm_requester_user_id matches current user ID', () => {
            const postModel = TestHelper.fakePostModel({
                props: {
                    llm_requester_user_id: currentUserId,
                },
            });
            expect(isPostRequester(postModel, currentUserId)).toBe(true);
        });

        it('returns false when llm_requester_user_id does not match', () => {
            const postModel = TestHelper.fakePostModel({
                props: {
                    llm_requester_user_id: 'different_user',
                },
            });
            expect(isPostRequester(postModel, currentUserId)).toBe(false);
        });

        it('returns false when props is empty object', () => {
            const postModel = TestHelper.fakePostModel({
                props: {},
            });
            expect(isPostRequester(postModel, currentUserId)).toBe(false);
        });
    });

    describe('error handling', () => {
        it('handles exceptions gracefully and returns false', () => {
            // Create a post object that throws when accessing props
            const faultyPost = {
                get props() {
                    throw new Error('Access denied');
                },
            } as any;

            expect(isPostRequester(faultyPost, currentUserId)).toBe(false);
        });
    });
});

describe('isToolCallRedacted', () => {
    it('should return true when pending_tool_call_redacted is true', () => {
        const post = TestHelper.fakePost({
            props: {pending_tool_call_redacted: 'true'},
        });
        expect(isToolCallRedacted(post)).toBe(true);
    });

    it('should return false when prop is not present', () => {
        const post = TestHelper.fakePost({
            props: {some_other_prop: 'value'},
        });
        expect(isToolCallRedacted(post)).toBe(false);
    });

    it('should return false when props is empty', () => {
        const post = TestHelper.fakePost({props: {}});
        expect(isToolCallRedacted(post)).toBe(false);
    });

    it('should return true for PostModel with redacted prop', () => {
        const postModel = TestHelper.fakePostModel({
            props: {pending_tool_call_redacted: 'true'},
        });
        expect(isToolCallRedacted(postModel)).toBe(true);
    });

    it('should return false when props access throws', () => {
        const faultyPost = {
            get props() {
                throw new Error('Access denied');
            },
        } as any;
        expect(isToolCallRedacted(faultyPost)).toBe(false);
    });
});

describe('isPendingToolResult', () => {
    it('should return true when pending_tool_result is true', () => {
        const post = TestHelper.fakePost({
            props: {pending_tool_result: 'true'},
        });
        expect(isPendingToolResult(post)).toBe(true);
    });

    it('should return false when prop is not present', () => {
        const post = TestHelper.fakePost({
            props: {some_other_prop: 'value'},
        });
        expect(isPendingToolResult(post)).toBe(false);
    });

    it('should return false when props is empty', () => {
        const post = TestHelper.fakePost({props: {}});
        expect(isPendingToolResult(post)).toBe(false);
    });

    it('should return true for PostModel with pending result prop', () => {
        const postModel = TestHelper.fakePostModel({
            props: {pending_tool_result: 'true'},
        });
        expect(isPendingToolResult(postModel)).toBe(true);
    });
});

describe('getToolApprovalStage', () => {
    const pendingToolCall: ToolCall = {
        id: 'tc1',
        name: 'search',
        description: 'Search tool',
        arguments: {},
        status: ToolCallStatus.Pending,
    };

    const acceptedToolCall: ToolCall = {
        id: 'tc2',
        name: 'fetch',
        description: 'Fetch tool',
        arguments: {},
        status: ToolCallStatus.Accepted,
    };

    it('should return Result when pending_tool_result is true', () => {
        const post = TestHelper.fakePost({
            props: {pending_tool_result: 'true'},
        });
        expect(getToolApprovalStage(post, [])).toBe(ToolApprovalStage.Result);
    });

    it('should return Call when there are pending tool calls', () => {
        const post = TestHelper.fakePost({props: {}});
        expect(getToolApprovalStage(post, [pendingToolCall])).toBe(ToolApprovalStage.Call);
    });

    it('should return null when no pending tools and no pending result', () => {
        const post = TestHelper.fakePost({props: {}});
        expect(getToolApprovalStage(post, [acceptedToolCall])).toBeNull();
    });

    it('should return Result even when there are pending tool calls', () => {
        const post = TestHelper.fakePost({
            props: {pending_tool_result: 'true'},
        });
        expect(getToolApprovalStage(post, [pendingToolCall])).toBe(ToolApprovalStage.Result);
    });
});

describe('mergeToolCalls', () => {
    const makeToolCall = (overrides: Partial<ToolCall> & {id: string}): ToolCall => ({
        name: 'tool',
        description: 'A tool',
        arguments: {},
        status: ToolCallStatus.Pending,
        ...overrides,
    });

    it('should return publicCalls unchanged when privateCalls is null', () => {
        const publicCalls = [makeToolCall({id: 'tc1', arguments: {q: 'hello'}})];
        expect(mergeToolCalls(publicCalls, null)).toBe(publicCalls);
    });

    it('should return publicCalls unchanged when privateCalls is empty', () => {
        const publicCalls = [makeToolCall({id: 'tc1', arguments: {q: 'hello'}})];
        expect(mergeToolCalls(publicCalls, [])).toBe(publicCalls);
    });

    it('should merge private arguments into public calls while preserving public status', () => {
        const publicCalls = [makeToolCall({id: 'tc1', status: ToolCallStatus.Accepted, arguments: {redacted: true}})];
        const privateCalls = [makeToolCall({id: 'tc1', status: ToolCallStatus.Pending, arguments: {q: 'secret'}})];

        const result = mergeToolCalls(publicCalls, privateCalls);
        expect(result).toHaveLength(1);
        expect(result[0].arguments).toEqual({q: 'secret'});
        expect(result[0].status).toBe(ToolCallStatus.Accepted);
    });

    it('should merge private result when present', () => {
        const publicCalls = [makeToolCall({id: 'tc1'})];
        const privateCalls = [makeToolCall({id: 'tc1', result: 'done'})];

        const result = mergeToolCalls(publicCalls, privateCalls);
        expect(result[0].result).toBe('done');
    });

    it('should not overwrite result when private result is undefined', () => {
        const publicCalls = [makeToolCall({id: 'tc1', result: 'original'})];
        const privateCalls = [makeToolCall({id: 'tc1', result: undefined})];

        const result = mergeToolCalls(publicCalls, privateCalls);
        expect(result[0].result).toBe('original');
    });

    it('should return private tool as-is when not found in public calls', () => {
        const publicCalls = [makeToolCall({id: 'tc1'})];
        const privateCalls = [makeToolCall({id: 'tc_unknown', name: 'private_only', arguments: {x: 1}})];

        const result = mergeToolCalls(publicCalls, privateCalls);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('tc_unknown');
        expect(result[0].name).toBe('private_only');
        expect(result[0].arguments).toEqual({x: 1});
    });
});
