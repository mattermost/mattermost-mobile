// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import {
    ChainPostsArgs,
    IdenticalRecordArgs,
    MatchExistingRecord,
    RangeOfValueArgs,
    RawChannel,
    RawPost,
    RawReaction,
    RawSlashCommand,
    RawTeam,
    RawUser,
    RawValue,
    RecordPair,
    RetrieveRecordsArgs,
    SanitizePostsArgs,
    SanitizeReactionsArgs,
} from '@typings/database/database';
import Reaction from '@typings/database/reaction';
import Post from '@typings/database/post';
import SlashCommand from '@typings/database/slash_command';
import Team from '@typings/database/team';
import User from '@typings/database/user';

const {CHANNEL, POST, REACTION, SLASH_COMMAND, TEAM, USER} = MM_TABLES.SERVER;

/**
 * sanitizePosts: Creates arrays of ordered and unordered posts.  Unordered posts are those posts that are not
 * present in the orders array
 * @param {SanitizePostsArgs} sanitizePosts
 * @param {RawPost[]} sanitizePosts.posts
 * @param {string[]} sanitizePosts.orders
 */
export const sanitizePosts = ({posts, orders}: SanitizePostsArgs) => {
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
        postsOrdered: orderedPosts,
        postsUnordered: unOrderedPosts,
    };
};

/**
 * createPostsChain: Basically creates the 'chain of posts' using the 'orders' array; each post is linked to the other
 * by the previous_post_id field.
 * @param {ChainPostsArgs} chainPosts
 * @param {string[]} chainPosts.orders
 * @param {RawPost[]} chainPosts.rawPosts
 * @param {string} chainPosts.previousPostId
 * @returns {RawPost[]}
 */
export const createPostsChain = ({orders, rawPosts, previousPostId = ''}: ChainPostsArgs) => {
    const posts: MatchExistingRecord[] = [];

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

    // similarObjects: Contains objects that are in both the RawReaction array and in the Reaction entity
    const similarObjects: Reaction[] = [];

    const createReactions: MatchExistingRecord[] = [];

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

/**
 * retrieveRecords: Retrieves records from the database
 * @param {RetrieveRecordsArgs} records
 * @param {Database} records.database
 * @param {string} records.tableName
 * @param {any} records.condition
 * @returns {Promise<Model[]>}
 */
export const retrieveRecords = async ({database, tableName, condition}: RetrieveRecordsArgs) => {
    const records = (await database.collections.get(tableName).query(condition).fetch()) as Model[];
    return records;
};

/**
 * hasSimilarUpdateAt: Database Operations on some entities are expensive.  As such, we would like to operate if and only if we are
 * 100% sure that the records are actually different from what we already have in the database.
 * @param {IdenticalRecordArgs} identicalRecord
 * @param {string} identicalRecord.tableName
 * @param {RecordValue} identicalRecord.newValue
 * @param {Model} identicalRecord.existingRecord
 * @returns {boolean}
 */
export const hasSimilarUpdateAt = ({tableName, newValue, existingRecord}: IdenticalRecordArgs) => {
    const guardTables = [CHANNEL, POST, SLASH_COMMAND, TEAM, USER];

    if (guardTables.includes(tableName)) {
        type Raw = RawPost | RawUser | RawTeam | RawSlashCommand | RawChannel
        type ExistingRecord = Post | User | Team | SlashCommand | Channel

        return (newValue as Raw).update_at === (existingRecord as ExistingRecord).updateAt;
    }
    return false;
};

/**
 * This method extracts one particular field 'fieldName' from the raw values and returns them as a string array
 * @param {RangeOfValueArgs} range
 * @param {string} range.fieldName
 * @param {RawValue[]} range.raws
 * @returns {string[]}
 */
export const getRangeOfValues = ({fieldName, raws}: RangeOfValueArgs) => {
    return raws.reduce((oneOfs, current: RawValue) => {
        const key = fieldName as keyof typeof current;
        const value: string = current[key] as string;
        if (value) {
            oneOfs.push(value);
        }
        return oneOfs;
    }, [] as string[]);
};

/**
 * getRawRecordPairs: Utility method that maps over the raws array to create an array of RecordPair
 * @param {any[]} raws
 * @returns {{record: undefined, raw: any}[]}
 */
export const getRawRecordPairs = (raws: any[]): RecordPair[] => {
    return raws.map((raw) => {
        return {raw, record: undefined};
    });
};

/**
 * getUniqueRawsBy: We have to ensure that we are not updating the same record twice in the same operation.
 * Hence, thought it might not occur, prevention is better than cure.  This function removes duplicates from the 'raws' array.
 * @param {RawValue[]} raws
 * @param {string} key
 */
export const getUniqueRawsBy = ({raws, key}:{ raws: RawValue[], key: string}) => {
    return [...new Map(raws.map((item) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const curItemKey = item[key];
        return [curItemKey, item];
    })).values()];
};
