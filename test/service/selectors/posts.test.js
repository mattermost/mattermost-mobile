// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import {makeGetPostsForThread} from 'service/selectors/entities/posts';
import deepFreezeAndThrowOnMutation from 'service/utils/deep_freeze';

describe('Selectors.Posts', () => {
    describe('makeGetPostsForThread', () => {
        const posts = {
            a: {id: 'a', channel_id: '1'},
            b: {id: 'b', channel_id: '1'},
            c: {id: 'c', root_id: 'a', channel_id: '1'},
            d: {id: 'd', root_id: 'b', channel_id: '1'},
            e: {id: 'e', root_id: 'a', channel_id: '1'},
            f: {id: 'f', channel_id: 'f'}
        };
        const testState = deepFreezeAndThrowOnMutation({
            entities: {
                posts: {
                    posts,
                    postsByChannel: {
                        1: ['a', 'b', 'c', 'd', 'e', 'f']
                    }
                }
            }
        });

        it('should return single post with no children', () => {
            const getPostsForThread = makeGetPostsForThread();

            assert.deepEqual(getPostsForThread(testState, {channelId: '1', rootId: 'f'}), [posts.f]);
        });

        it('should return post with children', () => {
            const getPostsForThread = makeGetPostsForThread();

            assert.deepEqual(getPostsForThread(testState, {channelId: '1', rootId: 'a'}), [posts.a, posts.c, posts.e]);
        });

        it('should return memoized result for identical props', () => {
            const getPostsForThread = makeGetPostsForThread();

            const props = {channelId: '1', rootId: 'a'};
            const result = getPostsForThread(testState, props);

            assert.equal(result, getPostsForThread(testState, props));
        });

        it('should return different result for different props', () => {
            const getPostsForThread = makeGetPostsForThread();

            const result = getPostsForThread(testState, {channelId: '1', rootId: 'a'});

            assert.notEqual(result, getPostsForThread(testState, {channelId: '1', rootId: 'a'}));
            assert.deepEqual(result, getPostsForThread(testState, {channelId: '1', rootId: 'a'}));
        });

        it('should return memoized result for multiple selectors with different props', () => {
            const getPostsForThread1 = makeGetPostsForThread();
            const getPostsForThread2 = makeGetPostsForThread();

            const props1 = {channelId: '1', rootId: 'a'};
            const result1 = getPostsForThread1(testState, props1);

            const props2 = {channelId: '1', rootId: 'b'};
            const result2 = getPostsForThread2(testState, props2);

            assert.equal(result1, getPostsForThread1(testState, props1));
            assert.equal(result2, getPostsForThread2(testState, props2));
        });
    });
});
