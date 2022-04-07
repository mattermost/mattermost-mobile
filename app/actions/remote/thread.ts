// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, processReceivedThreads, switchToThread, updateThread} from '@actions/local/thread';
import {fetchPostThread} from '@actions/remote/post';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {getCommonSystemValues} from '@queries/servers/system';
import {getIsCRTEnabled, getThreadById} from '@queries/servers/thread';

import {forceLogoutIfNecessary} from './session';

type FetchThreadsRequest = {
    error?: unknown;
} | {
    data: GetUserThreadsResponse;
};

type FetchThreadsOptions = {
    before?: string;
    after?: string;
    perPage?: number;
    deleted?: boolean;
    unread?: boolean;
    since?: number;
}

export const fetchAndSwitchToThread = async (serverUrl: string, rootId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    // Load thread before we open to the thread modal
    // @Todo: https://mattermost.atlassian.net/browse/MM-42232
    fetchPostThread(serverUrl, rootId);

    // Mark thread as read
    const isCRTEnabled = await getIsCRTEnabled(database);
    if (isCRTEnabled) {
        const post = await getPostById(database, rootId);
        if (post) {
            const thread = await getThreadById(database, rootId);
            if (thread?.unreadReplies || thread?.unreadMentions) {
                const channel = await getChannelById(database, post.channelId);
                if (channel) {
                    updateThreadRead(serverUrl, channel.teamId, thread.id, Date.now());
                }
            }
        }
    }

    switchToThread(serverUrl, rootId);

    return {};
};

export const fetchThreads = async (
    serverUrl: string,
    teamId: string,
    {
        before,
        after,
        perPage = General.CRT_CHUNK_SIZE,
        deleted = false,
        unread = false,
        since = 0,
    }: FetchThreadsOptions = {
        perPage: General.CRT_CHUNK_SIZE,
        deleted: false,
        unread: false,
        since: 0,
    },
): Promise<FetchThreadsRequest> => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const {config} = await getCommonSystemValues(database);

        const data = await client.getThreads('me', teamId, before, after, perPage, deleted, unread, since, config.Version);

        const {threads} = data;

        if (threads.length) {
            // Mark all fetched threads as following
            threads.forEach((thread: Thread) => {
                thread.is_following = true;
            });

            await processReceivedThreads(serverUrl, threads, teamId, false, !unread);
        }

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchThread = async (serverUrl: string, teamId: string, threadId: string, extended?: boolean) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const thread = await client.getThread('me', teamId, threadId, extended);

        await processReceivedThreads(serverUrl, [thread], teamId, false, false);

        return {data: thread};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateTeamThreadsAsRead = async (serverUrl: string, teamId: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.updateTeamThreadsAsRead('me', teamId);

        // Update locally
        await markTeamThreadsAsRead(serverUrl, teamId);

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateThreadRead = async (serverUrl: string, teamId: string, threadId: string, timestamp: number) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.updateThreadRead('me', teamId, threadId, timestamp);

        // Update locally
        await updateThread(serverUrl, threadId, {
            last_viewed_at: timestamp,
        });

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const updateThreadFollowing = async (serverUrl: string, teamId: string, threadId: string, state: boolean) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.updateThreadFollow('me', teamId, threadId, state);

        // Update locally
        await updateThread(serverUrl, threadId, {is_following: state});

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
