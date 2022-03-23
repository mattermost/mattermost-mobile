// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {addRecentReaction} from '@actions/local/reactions';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {getRecentPostsInChannel, getRecentPostsInThread} from '@queries/servers/post';
import {queryReaction} from '@queries/servers/reactions';
import {getCurrentChannelId, getCurrentUserId} from '@queries/servers/system';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type PostModel from '@typings/database/models/servers/post';

export const addReaction = async (serverUrl: string, postId: string, emojiName: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const currentUserId = await getCurrentUserId(operator.database);
        const reaction = await client.addReaction(currentUserId, postId, emojiName);
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

        if (models.length) {
            await operator.batchRecords(models);
        }

        return {reaction};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const removeReaction = async (serverUrl: string, postId: string, emojiName: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const currentUserId = await getCurrentUserId(database);
        await client.removeReaction(currentUserId, postId, emojiName);

        // should return one or no reaction
        const reaction = await queryReaction(database, emojiName, postId, currentUserId).fetch();

        if (reaction.length) {
            await database.write(async () => {
                await reaction[0].destroyPermanently();
            });
        }

        return {reaction};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const handleReactionToLatestPost = async (serverUrl: string, emojiName: string, add: boolean, rootId?: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        let posts: PostModel[];
        if (rootId) {
            posts = await getRecentPostsInThread(operator.database, rootId);
        } else {
            const channelId = await getCurrentChannelId(operator.database);
            posts = await getRecentPostsInChannel(operator.database, channelId);
        }

        if (add) {
            return addReaction(serverUrl, posts[0].id, emojiName);
        }
        return removeReaction(serverUrl, posts[0].id, emojiName);
    } catch (error) {
        return {error};
    }
};
