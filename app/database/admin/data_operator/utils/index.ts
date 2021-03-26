// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {ChainPosts, SanitizePosts, SanitizeReactions, RawPost, RawReaction} from '@typings/database/database';
import Reaction from '@typings/database/reaction';

const {REACTION} = MM_TABLES.SERVER;

/**
 * sanitizePosts: Creates arrays of ordered and unordered posts.  Unordered posts are those posts that are not
 * present in the orders array
 * @param {SanitizePosts} sanitizePosts
 * @param {RawPost[]} sanitizePosts.posts
 * @param {string[]} sanitizePosts.orders
 */
export const sanitizePosts = ({posts, orders}: SanitizePosts) => {
    const orderedPosts:RawPost[] = [];
    const unOrderedPosts:RawPost[] = [];

    posts.forEach((post) => {
        if (post?.id && orders.includes(post.id)) {
            orderedPosts.push(post);
        } else {
            unOrderedPosts.push(post);
        }
    });

    return {
        orderedPosts,
        unOrderedPosts,
    };
};

/**
 * createPostsChain: Basically creates the 'chain of posts' using the 'orders' array; each post is linked to the other
 * by the previous_post_id field.
 * @param {ChainPosts} chainPosts
 * @param {string[]} chainPosts.orders
 * @param {RawPost[]} chainPosts.rawPosts
 * @param {string} chainPosts.previousPostId
 * @returns {RawPost[]}
 */
export const createPostsChain = ({orders, rawPosts, previousPostId = ''}: ChainPosts) => {
    const posts: RawPost[] = [];
    rawPosts.forEach((post) => {
        const postId = post.id;
        const orderIndex = orders.findIndex((order) => {
            return order === postId;
        });

        if (orderIndex === -1) {
            // This case will not occur as we are using 'ordered' posts for this step.  However, if this happens, that
            // implies that we might be dealing with an unordered post and in which case we do not action on it.
        } else if (orderIndex === 0) {
            posts.push({...post, prev_post_id: previousPostId});
        } else {
            posts.push({...post, prev_post_id: orders[orderIndex - 1]});
        }
    });

    return posts;
};

/**
 * sanitizeReactions: Treats reactions happening on a Post. For example, a user can add/remove an emoji.  Hence, this function
 * tell us which reactions to create/delete in the Reaction table and which custom-emoji to create in our database.
 * For more information, please have a look at https://community.mattermost.com/core/pl/rq9e8jnonpyrmnyxpuzyc4d6ko
 * @param {SanitizeReactions} sanitizeReactions
 * @param {Database} sanitizeReactions.database
 * @param {string} sanitizeReactions.post_id
 * @param {RawReaction[]} sanitizeReactions.rawReactions
 * @returns {Promise<{createReactions: RawReaction[], createEmojis: {name: string}[], deleteReactions: Reaction[]}>}
 */
export const sanitizeReactions = async ({database, post_id, rawReactions}: SanitizeReactions) => {
    const reactions = (await database.collections.
        get(REACTION).
        query(Q.where('post_id', post_id)).
        fetch()) as Reaction[];

    // similarObjects: Contains objects that are in both the RawReaction array and in the Reaction entity
    const similarObjects: Reaction[] = [];

    const createReactions: RawReaction[] = [];

    const emojiSet = new Set();

    for (let i = 0; i < rawReactions.length; i++) {
        const rawReaction = rawReactions[i] as RawReaction;

        // Do we have a similar value of rawReaction in the REACTION table?
        const idxPresent = reactions.findIndex((value) => {
            return (
                value.userId === rawReaction.user_id &&
                value.emojiName === rawReaction.emoji_name
            );
        });

        if (idxPresent === -1) {
            // So, we don't have a similar Reaction object.  That one is new...so we'll create it
            createReactions.push(rawReaction);

            // If that reaction is new, that implies that the emoji might also be new
            emojiSet.add(rawReaction.emoji_name);
        } else {
            // we have a similar object in both reactions and rawReactions; we'll pop it out from both arrays
            similarObjects.push(reactions[idxPresent]);
        }
    }

    // finding out elements to delete using array subtract
    const deleteReactions = reactions.
        filter((reaction) => !similarObjects.includes(reaction)).
        map((outCast) => outCast.prepareDestroyPermanently());

    const createEmojis = Array.from(emojiSet).map((emoji) => {
        return {name: emoji};
    });

    return {createReactions, createEmojis, deleteReactions};
};
