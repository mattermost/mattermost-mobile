// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {mockedPosts} from './mock';
import {createPostsChain, sanitizePosts} from './utils';

describe('DataOperator: Utils tests', () => {
    it('sanitizePosts: should filter between ordered and unordered posts', () => {
        const {orderedPosts, unOrderedPosts} = sanitizePosts({posts: Object.values(mockedPosts.posts), orders: mockedPosts.order});
        expect(orderedPosts.length).toBe(4);
        expect(unOrderedPosts.length).toBe(2);
    });

    it('createPostsChain: should link posts amongst each other based on order array', () => {
        const previousPostId = 'prev_xxyuoxmehne';
        const chainedOfPosts = createPostsChain({orders: mockedPosts.order, rawPosts: Object.values(mockedPosts.posts), previousPostId});

        // eslint-disable-next-line max-nested-callbacks
        const post1 = chainedOfPosts.find((post) => {
            return post.id === '8swgtrrdiff89jnsiwiip3y1eoe';
        });
        expect(post1).toBeTruthy();
        expect(post1!.prev_post_id).toBe(previousPostId);

        // eslint-disable-next-line max-nested-callbacks
        const post2 = chainedOfPosts.find((post) => {
            return post.id === '8fcnk3p1jt8mmkaprgajoxz115a';
        });
        expect(post2).toBeTruthy();
        expect(post2!.prev_post_id).toBe('8swgtrrdiff89jnsiwiip3y1eoe');

        // eslint-disable-next-line max-nested-callbacks
        const post3 = chainedOfPosts.find((post) => {
            return post.id === '3y3w3a6gkbg73bnj3xund9o5ic';
        });
        expect(post3).toBeTruthy();
        expect(post3!.prev_post_id).toBe('8fcnk3p1jt8mmkaprgajoxz115a');

        // eslint-disable-next-line max-nested-callbacks
        const post4 = chainedOfPosts.find((post) => {
            return post.id === '4btbnmticjgw7ewd3qopmpiwqw';
        });
        expect(post4).toBeTruthy();
        expect(post4!.prev_post_id).toBe('3y3w3a6gkbg73bnj3xund9o5ic');
    });
});
