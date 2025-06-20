// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {RecordPair, SanitizeReactionsArgs} from '@typings/database/database';
import type ReactionModel from '@typings/database/models/servers/reaction';

const {REACTION} = MM_TABLES.SERVER;

/**
 * sanitizeReactions: Treats reactions happening on a Post. For example, a user can add/remove an emoji.  Hence, this function
 * tell us which reactions to create/delete in the Reaction table and which custom-emoji to create in our database.
 * For more information, please have a look at https://community.mattermost.com/core/pl/rq9e8jnonpyrmnyxpuzyc4d6ko
 * @param {SanitizeReactionsArgs} sanitizeReactions
 * @param {Database} sanitizeReactions.database
 * @param {string} sanitizeReactions.post_id
 * @param {RawReaction[]} sanitizeReactions.rawReactions
 * @returns {Promise<{createReactions: RawReaction[],  deleteReactions: Reaction[]}>}
 */
export const sanitizeReactions = async ({database, post_id, rawReactions, skipSync}: SanitizeReactionsArgs) => {
    const reactions = (await database.
        get<ReactionModel>(REACTION).
        query(Q.where('post_id', post_id)).
        fetch());

    // similarObjects: Contains objects that are in both the RawReaction array and in the Reaction table
    const similarObjects = new Set<ReactionModel>();

    const createReactions: Array<RecordPair<ReactionModel, Reaction>> = [];

    const reactionsMap = reactions.reduce((result: Record<string, ReactionModel>, reaction) => {
        result[`${reaction.userId}-${reaction.emojiName}`] = reaction;
        return result;
    }, {});

    for (const raw of rawReactions) {
        // If the reaction is not present let's add it to the db
        const exists = reactionsMap[`${raw.user_id}-${raw.emoji_name}`];

        if (exists) {
            similarObjects.add(exists);
        } else {
            createReactions.push({raw});
        }
    }

    if (skipSync) {
        return {createReactions, deleteReactions: []};
    }

    // finding out elements to delete
    const deleteReactions = reactions.
        filter((reaction) => !similarObjects.has(reaction));

    return {createReactions, deleteReactions};
};
