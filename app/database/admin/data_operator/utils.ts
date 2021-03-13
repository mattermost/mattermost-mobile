// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {RawPost, RawReaction} from '@typings/database/database';
import Reaction from '@typings/database/reaction';

import {AddPreviousPostId, SanitizePosts, SanitizeReactions} from './types';

const {REACTION} = MM_TABLES.SERVER;

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

export const addPrevPostId = ({orders, values, previousPostId = ''}: AddPreviousPostId) => {
    const posts: RawPost[] = [];
    values.forEach((post) => {
        const postId = post.id;
        const postIdx = orders.findIndex((order) => {
            return order === postId;
        });

        if (postIdx === -1) {
            // something bad happened here ?
        } else {
            const prevPostId =
        postIdx + 1 < orders.length ? orders[postIdx + 1] : previousPostId;
            posts.push({...post, prev_post_id: prevPostId});
        }
    });

    return posts;
};

/**
 * sanitizePosts: Creates an array of RawPosts whereby each member's post_id is also present in the order array
 * @param {RawPost[]} posts
 * @param {string[]} order
 */
export const sanitizePosts = ({posts, orders}: SanitizePosts) => {
    const sanitizedPosts = posts.filter((post) => {
        return post?.id && orders.includes(post.id);
    });
    return sanitizedPosts;
};
