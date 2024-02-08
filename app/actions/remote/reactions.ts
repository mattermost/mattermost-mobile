// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addRecentReaction} from '@actions/local/reactions';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getRecentPostsInChannel, getRecentPostsInThread} from '@queries/servers/post';
import {queryReaction} from '@queries/servers/reaction';
import {getCurrentChannelId, getCurrentUserId} from '@queries/servers/system';
import {getEmojiFirstAlias} from '@utils/emoji/helpers';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Model} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

export async function getIsReactionAlreadyAddedToPost(serverUrl: string, postId: string, emojiName: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentUserId = await getCurrentUserId(database);
        const emojiAlias = getEmojiFirstAlias(emojiName);
        return await queryReaction(database, emojiAlias, postId, currentUserId).fetchCount() > 0;
    } catch (error) {
        logDebug('error on getIsReactionAlreadyAddedToPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function toggleReaction(serverUrl: string, postId: string, emojiName: string) {
    try {
        const isReactionAlreadyAddedToPost = await getIsReactionAlreadyAddedToPost(serverUrl, postId, emojiName);

        if (isReactionAlreadyAddedToPost) {
            return removeReaction(serverUrl, postId, emojiName);
        }
        return addReaction(serverUrl, postId, emojiName);
    } catch (error) {
        logDebug('error on toggleReaction', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function addReaction(serverUrl: string, postId: string, emojiName: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentUserId = await getCurrentUserId(database);
        const emojiAlias = getEmojiFirstAlias(emojiName);
        const reacted = await queryReaction(database, emojiAlias, postId, currentUserId).fetchCount() > 0;
        if (!reacted) {
            const reaction = await client.addReaction(currentUserId, postId, emojiAlias);
            const models: Model[] = [];

            const reactions = await operator.handleReactions({
                postsReactions: [{
                    post_id: postId,
                    reactions: [reaction],
                }],
                prepareRecordsOnly: true,
                skipSync: true, // this prevents the handler from deleting previous reactions
            });
            models.push(...reactions);

            const recent = await addRecentReaction(serverUrl, [emojiName], true);
            if (Array.isArray(recent)) {
                models.push(...recent);
            }

            await operator.batchRecords(models, 'addReaction');

            return {reaction};
        }
        return {
            reaction: {
                user_id: currentUserId,
                post_id: postId,
                emoji_name: emojiAlias,
                create_at: 0,
            } as Reaction,
        };
    } catch (error) {
        logDebug('error on addReaction', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export const removeReaction = async (serverUrl: string, postId: string, emojiName: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentUserId = await getCurrentUserId(database);
        const emojiAlias = getEmojiFirstAlias(emojiName);
        await client.removeReaction(currentUserId, postId, emojiAlias);

        // should return one or no reaction
        const reaction = await queryReaction(database, emojiAlias, postId, currentUserId).fetch();

        if (reaction.length) {
            await database.write(async () => {
                await reaction[0].destroyPermanently();
            });
        }

        return {reaction};
    } catch (error) {
        logDebug('error on removeReaction', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const handleReactionToLatestPost = async (serverUrl: string, emojiName: string, add: boolean, rootId?: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let posts: PostModel[];
        if (rootId) {
            posts = await getRecentPostsInThread(database, rootId);
        } else {
            const channelId = await getCurrentChannelId(database);
            posts = await getRecentPostsInChannel(database, channelId);
        }

        if (add) {
            return addReaction(serverUrl, posts[0].id, emojiName);
        }
        return removeReaction(serverUrl, posts[0].id, emojiName);
    } catch (error) {
        return {error};
    }
};
