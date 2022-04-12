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
import {getIsCRTEnabled, getNewestThreadInTeam, getThreadById} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type {Model} from '@nozbe/watermelondb';

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
    totalsOnly?: boolean;
};

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
        since,
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

        const data = await client.getThreads('me', teamId, before, after, perPage, deleted, unread, since, false, config.Version);

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

enum Direction {
    Up,
    Down,
}

async function fetchBatchThreads(
    serverUrl: string,
    teamId: string,
    options: FetchThreadsOptions,
    pages?: number,
): Promise<{error: unknown; data?: Thread[]}> {
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

    // if we start from the begging of time (since = 0) we need to fetch threads from newest to oldest (Direction.Down)
    // if there is another point in time, we need to fetch threads from oldest to newest (Direction.Up)
    let direction = Direction.Up;
    if (options.since === 0) {
        direction = Direction.Down;
    }

    const currentUser = await getCurrentUser(operator.database);
    if (!currentUser) {
        return {error: 'currentUser not found'};
    }

    const {config} = await getCommonSystemValues(operator.database);
    const data: Thread[] = [];

    const fetchThreadsFunc = async (opts: FetchThreadsOptions) => {
        let page = 0;
        const {before, after, perPage = General.CRT_CHUNK_SIZE, deleted, unread, since} = opts;

        page += 1;
        const {threads} = await client.getThreads(currentUser.id, teamId, before, after, perPage, deleted, unread, since, false, config.Version);
        if (threads.length) {
            // Mark all fetched threads as following
            for (const thread of threads) {
                thread.is_following = true;
            }

            data.push(...threads);

            if (threads.length === perPage) {
                const newOptions: FetchThreadsOptions = {perPage, deleted, unread};
                if (direction === Direction.Down) {
                    const last = threads[threads.length - 1];
                    newOptions.before = last.id;
                } else {
                    const first = threads[0];
                    newOptions.after = first.id;
                }
                if (pages != null && page < pages) {
                    fetchThreadsFunc(newOptions);
                }
            }
        }
    };

    try {
        await fetchThreadsFunc(options);
    } catch (error) {
        if (__DEV__) {
            throw error;
        }

        return {error, data};
    }

    return {error: false, data};
}

export async function fetchNewThreads(
    serverUrl: string,
    teamId: string,
    prepareRecordsOnly = false,
): Promise<{error: unknown; models?: Model[]}> {
    const options: FetchThreadsOptions = {
        unread: false,
        deleted: true,
        perPage: 60,
    };

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const newestThread = await getNewestThreadInTeam(operator.database, teamId, false);
    options.since = newestThread ? newestThread.lastReplyAt : 0;

    let response = {
        error: undefined,
        data: [],
    } as {
        error: unknown;
        data?: Thread[];
    };

    let loadedInGlobalThreads = true;

    // if we have no threads in the DB fetch all unread ones
    if (options.since === 0) {
        // options to fetch all unread threads
        options.deleted = false;
        options.unread = true;
        loadedInGlobalThreads = false;
    }

    response = await fetchBatchThreads(serverUrl, teamId, options);

    const {error: nErr, data} = response;

    if (nErr) {
        return {error: nErr};
    }

    if (!data?.length) {
        return {error: false, models: []};
    }

    const {error, models} = await processReceivedThreads(serverUrl, data, teamId, true, loadedInGlobalThreads);

    if (!error && !prepareRecordsOnly && models?.length) {
        try {
            await operator.batchRecords(models);
        } catch (err) {
            if (__DEV__) {
                throw err;
            }
            return {error: true};
        }
    }

    return {error: false, models};
}
