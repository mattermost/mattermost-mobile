// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENT_POST_TYPES} from '@agents/constants';

import TestHelper from '@test/test_helper';

import {isAgentPost, isPostRequester} from './utils';

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
