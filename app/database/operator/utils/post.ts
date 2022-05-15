// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ChainPostsArgs, SanitizePostsArgs} from '@typings/database/database';

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
    const ordersSet = new Set(orders);

    posts.forEach((post) => {
        if (post?.id && ordersSet.has(post.id)) {
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
 * @param {string[]} chainPosts.order
 * @param {Post[]} chainPosts.posts
 * @param {string} chainPosts.previousPostId
 * @returns {Post[]}
 */
export const createPostsChain = ({order = [], posts, previousPostId = ''}: ChainPostsArgs) => {
    const postsByIds = posts.reduce((result: Record<string, Post>, p) => {
        result[p.id] = p;
        return result;
    }, {});
    return order.reduce<Post[]>((result, id, index) => {
        const post = postsByIds[id];

        if (post) {
            if (index === order.length - 1) {
                result.push({...post, prev_post_id: previousPostId});
            } else {
                result.push({...post, prev_post_id: order[index + 1]});
            }
        }

        return result;
    }, []).reverse();
};

export const getPostListEdges = (posts: Post[]) => {
    // Sort a clone of 'posts' array by create_at
    const sortedPosts = [...posts].sort((a, b) => {
        return a.create_at - b.create_at;
    });

    // The first element (beginning of chain)
    const firstPost = sortedPosts[0];
    const lastPost = sortedPosts[sortedPosts.length - 1];

    return {firstPost, lastPost};
};
