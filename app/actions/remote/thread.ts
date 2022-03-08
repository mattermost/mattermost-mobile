// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {processThreadsWithPostsFetched, processUpdateTeamThreadsAsRead, processUpdateThreadFollow, processUpdateThreadRead} from '@actions/local/thread';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryCurrentUser} from '@queries/servers/user';

import {forceLogoutIfNecessary} from './session';

export type GetThreadsRequest = {
    error?: unknown;
} | {
    data: GetUserThreadsResponse;
};

export const getThreads = async (serverUrl: string, teamId: string, before?: string, after?: string, perPage = General.CRT_CHUNK_SIZE, deleted = false, unread = false, since = 0): Promise<GetThreadsRequest> => {
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
            return {};
        }
        const {config} = await queryCommonSystemValues(database);

        const data = await client.getThreads(config.Version, currentUser.id, teamId, before, after, perPage, deleted, unread, since);

        const {threads, ...threadsCountData} = data;

        // Mark all fetched threads as following
        threads.forEach((thread: Thread) => {
            thread.is_following = true;
            if (!unread) {
                thread.loaded_in_global_threads = true;
            }
        });

        await processThreadsWithPostsFetched(serverUrl, teamId, threads, threadsCountData);

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const getThread = async (serverUrl: string, teamId: string, threadId: string, extended?: boolean) => {
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
            return {};
        }

        const thread = await client.getThread(currentUser.id, teamId, threadId, extended);

        await processThreadsWithPostsFetched(serverUrl, teamId, [thread]);

        return {data: thread};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateTeamThreadsAsRead = async (serverUrl: string, teamId: string) => {
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
            return {};
        }
        const data = await client.updateTeamThreadsAsRead(currentUser.id, teamId);

        // Update locally
        await processUpdateTeamThreadsAsRead(serverUrl, teamId);

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateThreadRead = async (serverUrl: string, teamId: string, threadId: string, timestamp: number) => {
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
            return {};
        }
        const data = await client.updateThreadRead(currentUser.id, teamId, threadId, timestamp);

        // Update locally
        await processUpdateThreadRead(serverUrl, threadId, timestamp);

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateThreadFollow = async (serverUrl: string, teamId: string, threadId: string, state: boolean) => {
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
            return {};
        }
        const data = await client.updateThreadFollow(currentUser.id, teamId, threadId, state);

        // Update locally
        await processUpdateThreadFollow(serverUrl, threadId, state);

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
