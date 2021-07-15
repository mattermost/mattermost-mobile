// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ChainPostsArgs, RecordPair, SanitizePostsArgs} from '@typings/database/database';

/**
 * sanitizePosts: Creates arrays of ordered and unordered posts.  Unordered posts are those posts that are not
 * present in the orders array
 * @param {SanitizePostsArgs} sanitizePosts
 * @param {Post[]} sanitizePosts.posts
 * @param {string[]} sanitizePosts.orders
 */
export const sanitizePosts = ({posts, orders}: SanitizePostsArgs) => {
    const orderedPosts: Post[] = [];
    const unOrderedPosts: Post[] = [];

    posts.forEach((post) => {
        if (post?.id && orders.includes(post.id)) {
            orderedPosts.push(post);
        } else {
            unOrderedPosts.push(post);
        }
    });

    return {
        postsOrdered: orderedPosts,
        postsUnordered: unOrderedPosts,
    };
};

/**
 * createPostsChain: Basically creates the 'chain of posts' using the 'orders' array; each post is linked to the other
 * by the previous_post_id field.
 * @param {ChainPostsArgs} chainPosts
 * @param {string[]} chainPosts.orders
 * @param {Post[]} chainPosts.rawPosts
 * @param {string} chainPosts.previousPostId
 * @returns {Post[]}
 */
export const createPostsChain = ({orders, rawPosts, previousPostId = ''}: ChainPostsArgs) => {
    const posts: RecordPair[] = [];

    rawPosts.forEach((post) => {
        const postId = post.id;
        const orderIndex = orders.findIndex((order) => {
            return order === postId;
        });

        if (orderIndex === -1) {
            // This case will not occur as we are using 'ordered' posts for this step.  However, if this happens, that
            // implies that we might be dealing with an unordered post and in which case we do not action on it.
        } else if (orderIndex === 0) {
            posts.push({record: undefined, raw: {...post, prev_post_id: previousPostId}});
        } else {
            posts.push({record: undefined, raw: {...post, prev_post_id: orders[orderIndex - 1]}});
        }
    });

    return posts;
};
