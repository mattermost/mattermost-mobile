// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import websocketManager from '@managers/websocket_manager';
import {getConfigValue} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {CreateResponse} from '@hooks/handle_send_message';

export async function createScheduledPost(serverUrl: string, schedulePost: ScheduledPost): Promise<CreateResponse> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const ws = websocketManager.getClient(serverUrl);
    const connectionId = ws?.getConnectionId();

    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.createScheduledPost(schedulePost, connectionId);

        // TODO - record scheduled post in database here
        return {data: true, response};
    } catch (error) {
        logError('error on createScheduledPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error: getFullErrorMessage(error)};
    }
}

export async function fetchScheduledPosts(serverUrl: string, teamId: string, includeDirectChannels = false, groupLabel?: RequestGroupLabel) {
    console.log('fetchScheduledPosts', serverUrl, teamId, includeDirectChannels, groupLabel);

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!operator || !database) {
        return {error: `${serverUrl} database not found`};
    }
    try {
        const client = NetworkManager.getClient(serverUrl);

        const scheduledPostEnabled = (await getConfigValue(database, 'ScheduledPosts')) === 'true';
        if (!scheduledPostEnabled) {
            return {scheduledPosts: []};
        }

        console.log('AAA');

        const scheduledPostsResponse = await client.getScheduledPostsForTeam(teamId, includeDirectChannels, groupLabel);

        console.log('BBB');

        console.log({scheduledPostsResponse});

        const {directChannels = [], ...scheduledPostsByTeam} = scheduledPostsResponse;

        console.log({directChannels, scheduledPostsByTeam});

        const scheduledPosts = [...Object.values(scheduledPostsByTeam).flat(), ...directChannels];

        console.log(JSON.stringify(scheduledPosts, null, 2));

        console.log('CCC');
        // if (scheduledPosts.length) {
            await operator.handleScheduledPosts({
                actionType: ActionType.SCHEDULED_POSTS.RECEIVED_ALL_SCHEDULED_POSTS,
                scheduledPosts,
                prepareRecordsOnly: false,
                includeDirectChannelPosts: includeDirectChannels,
            });
        // }

        return {scheduledPosts};
    } catch (error) {
        console.log({error});
        logError('error on fetchScheduledPosts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function deleteScheduledPost(serverUrl: string, scheduledPostId: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    try {
        const client = NetworkManager.getClient(serverUrl);
        const ws = websocketManager.getClient(serverUrl);

        const result = await client.deleteScheduledPost(scheduledPostId, ws?.getConnectionId());

        if (result) {
            await operator.handleScheduledPosts({
                actionType: ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST,
                scheduledPosts: [result],
                prepareRecordsOnly: false,
            });
        }

        return {scheduledPost: result};
    } catch (error) {
        logError('error on deleteScheduledPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
