// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {processPostsFetched} from '@actions/local/post';
import {ActionType, General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryCurrentUser} from '@queries/servers/user';

import {forceLogoutIfNecessary} from './session';

export type MyPreferencesRequest = {
    preferences?: PreferenceType[];
    error?: unknown;
}

export const getThreads = async (serverUrl: string, teamId: $ID<Team>, before?: $ID<Post>, after?: $ID<Post>, perPage = General.CRT_CHUNK_SIZE, deleted = false, unread = false, since = 0): Promise<any> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const {database} = operator;
        const currentUser = await queryCurrentUser(database);
        if (!currentUser) {
            return [];
        }
        const {config} = await queryCommonSystemValues(database);

        const data = await client.getThreads(config.Version, currentUser.id, teamId, before, after, perPage, deleted, unread, since);

        const posts = [];
        for (let i = 0; i < data.threads.length; i++) {
            const {post} = data.threads[i];
            posts.push(post);
        }

        await processPostsFetched(serverUrl, ActionType.POSTS.RECEIVED_IN_CHANNEL, {
            order: [],
            posts,
        });

        return data;
    } catch (error) {
        console.log(error);
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
