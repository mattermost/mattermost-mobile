// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCurrentUserId} from '@queries/servers/system';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type SystemModel from '@typings/database/models/servers/system';

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
        const currentUserId = await queryCurrentUserId(operator.database);
        const reaction = await client.addReaction(currentUserId, postId, emojiName);

        await operator.handleReactions({
            postsReactions: [{
                post_id: postId,
                reactions: [reaction],
            }],
            prepareRecordsOnly: false,
        });

        addRecentReaction(serverUrl, emojiName);

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
        const currentUserId = await queryCurrentUserId(database);
        await client.removeReaction(currentUserId, postId, emojiName);

        // should return one or no reaction
        const reaction = await database.get(MM_TABLES.SERVER.REACTION).query(
            Q.where('emoji_name', emojiName),
            Q.where('post_id', postId),
            Q.where('user_id', currentUserId),
        ).fetch();

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

export const addRecentReaction = async (serverUrl: string, emojiName: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const recent = [];
    try {
        const emojis = await operator.database.get(MM_TABLES.SERVER.SYSTEM).find(SYSTEM_IDENTIFIERS.RECENT_REACTIONS) as SystemModel;
        recent.push(...emojis.value);
    } catch {
        // no previous values.. continue
    }

    try {
        recent.unshift(emojiName);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: JSON.stringify(recent),
            }],
            prepareRecordsOnly: false,
        });

        return {error: undefined};
    } catch (error) {
        return {error};
    }
};
