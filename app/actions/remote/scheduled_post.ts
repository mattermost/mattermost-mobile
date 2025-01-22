// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import websocketManager from '@managers/websocket_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import DatabaseManager from '@database/manager';
import {Client} from '@client/rest';
import {getCurrentUserId} from '@queries/servers/system';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {getValidEmojis, matchEmoticons} from '@utils/emoji/helpers';
import {addRecentReaction} from '@actions/local/reactions';
import type Model from '@nozbe/watermelondb/Model';

export async function createScheduledPost(serverUrl: string, schedulePost: ScheduledPost, files: FileInfo[] = [], connectionId?: string, fetchOnly = false) {
    // try {
    //     const client = NetworkManager.getClient(serverUrl);
    //     const ws = websocketManager.getClient(serverUrl);
    //
    //     const created = await client.createScheduledPost(schedulePost, ws?.getConnectionId());
    //
    //     if (!fetchOnly) {
    //         // TODO - to be implemented later once DB tables are ready
    //         // await operator.handleScheduledPost({scheduledPosts: [created], prepareRecordsOnly: false});
    //     }
    //     return {scheduledPost: created};
    // } catch (error) {
    //     logError('error on createScheduledPost', getFullErrorMessage(error));
    //     forceLogoutIfNecessary(serverUrl, error);
    //     return {error};
    // }

    console.log('createScheduledPost', serverUrl, schedulePost, files, connectionId, fetchOnly);


    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    // const currentUserId = await getCurrentUserId(database);
    // const timestamp = Date.now();

    // const initialPostModels: Model[] = [];


    const customEmojis = await queryAllCustomEmojis(database).fetch();
    const emojiInMessage = matchEmoticons(schedulePost.message || '');
    const reactionModels = await addRecentReaction(serverUrl, getValidEmojis(emojiInMessage, customEmojis), true);
    // if (!('error' in reactionModels) && reactionModels.length) {
    //     initialPostModels.push(...reactionModels);
    // }

    let createdScheduledPost: ScheduledPost;

    try {
        createdScheduledPost = await client.createScheduledPost(schedulePost, connectionId);
    } catch (error) {
        console.log({error: JSON.stringify(error)});
        logError('error on createScheduledPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    // TODO - record scheduled post in database here

    console.log('createdScheduledPost', createdScheduledPost);
    return {data: true};
}
