// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {RecordPair, SanitizeReactionsArgs} from '@typings/database/database';
import Reaction from '@typings/database/models/servers/reaction';

const {REACTION} = MM_TABLES.SERVER;

/**
 * sanitizeReactions: Treats reactions happening on a Post. For example, a user can add/remove an emoji.  Hence, this function
 * tell us which reactions to create/delete in the Reaction table and which custom-emoji to create in our database.
 * For more information, please have a look at https://community.mattermost.com/core/pl/rq9e8jnonpyrmnyxpuzyc4d6ko
 * @param {SanitizeReactionsArgs} sanitizeReactions
 * @param {Database} sanitizeReactions.database
 * @param {string} sanitizeReactions.post_id
 * @param {RawReaction[]} sanitizeReactions.rawReactions
 * @returns {Promise<{createReactions: RawReaction[], createEmojis: {name: string}[], deleteReactions: Reaction[]}>}
 */
export const sanitizeReactions = async ({database, post_id, rawReactions}: SanitizeReactionsArgs) => {
    const reactions = (await database.collections.
        get(REACTION).
        query(Q.where('post_id', post_id)).
        fetch()) as Reaction[];

    // similarObjects: Contains objects that are in both the RawReaction array and in the Reaction table
    const similarObjects: Reaction[] = [];

    const createReactions: RecordPair[] = [];

    const emojiSet = new Set();

    for (let i = 0; i < rawReactions.length; i++) {
        const rawReaction = rawReactions[i];

        // Do we have a similar value of rawReaction in the REACTION table?
        const idxPresent = reactions.findIndex((value) => {
            return (
                value.userId === rawReaction.user_id &&
                value.emojiName === rawReaction.emoji_name
            );
        });

        if (idxPresent === -1) {
            // So, we don't have a similar Reaction object.  That one is new...so we'll create it
            createReactions.push({record: undefined, raw: rawReaction});

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
