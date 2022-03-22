// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {processReceivedThreads, processUpdateTeamThreadsAsRead, processUpdateThreadFollow, processUpdateThreadRead, switchToThread} from '@actions/local/thread';
import {fetchPostThread} from '@actions/remote/post';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {getCommonSystemValues} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {getNewestThreadInTeam} from '@queries/servers/thread';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

export type FetchThreadOptions = {
    before?: string;
    after?: string;
    perPage?: number;
    deleted?: boolean;
    unread?: boolean;
    since?: number;
};

export type GetThreadsRequest = {
    error?: unknown;
} | {
    data: GetUserThreadsResponse;
};

export const fetchAndSwitchToThread = async (serverUrl: string, rootId: string) => {
    // Load thread before we open to the thread modal
    // @Todo: https://mattermost.atlassian.net/browse/MM-42232
    fetchPostThread(serverUrl, rootId);

    switchToThread(serverUrl, rootId);
};

export const getThreads = async (
    serverUrl: string,
    teamId: string,
    {
        before,
        after,
        perPage = General.CRT_CHUNK_SIZE,
        deleted = false,
        unread = false,
        since,
    }: FetchThreadOptions = {
        perPage: General.CRT_CHUNK_SIZE,
        deleted: false,
        unread: false,
        since: 0,
    },
): Promise<GetThreadsRequest> => {
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
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {};
        }
        const {config} = await getCommonSystemValues(database);

        const data = await client.getThreads(config.Version, currentUser.id, teamId, before, after, perPage, deleted, unread, since);

        const {threads} = data;

        if (threads.length) {
            // Mark all fetched threads as following
            threads.forEach((thread: Thread) => {
                thread.is_following = true;
                if (!unread) {
                    thread.loaded_in_global_threads = true;
                }
            });

            await processReceivedThreads(serverUrl, threads, teamId);
        }

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
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {};
        }

        const thread = await client.getThread(currentUser.id, teamId, threadId, extended);

        await processReceivedThreads(serverUrl, [thread], teamId);

        return {data: thread};
        return {};
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
        const currentUser = await getCurrentUser(database);
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
        const currentUser = await getCurrentUser(database);
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
        const currentUser = await getCurrentUser(database);
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

enum Direction {
    Up,
    Down,
}

async function batchSyncThreads(serverUrl: string, teamId: string, options: FetchThreadOptions, pages?: number): Promise<{error: unknown; models: Model[]}> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`, models: []};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error, models: []};
    }

    // if we start from the begging of time (since = 0) we need to fetch threads from newest to oldest (Direction.Down)
    // if there is another point in time, we need to fetch threads from oldest to newest (Direction.Up)
    let direction = Direction.Up;
    if (options.since === 0) {
        direction = Direction.Down;
    }

    const currentUser = await getCurrentUser(operator.database);
    if (!currentUser) {
        return {error: true, models: []};
    }

    const {config} = await getCommonSystemValues(operator.database);
    const allThreadModels: Model[] = [];

    const fetchThreads = async (opts: FetchThreadOptions) => {
        let page = 0;
        const {before, after, perPage = General.CRT_CHUNK_SIZE, deleted, unread, since} = opts;

        try {
            page += 1;
            const {threads} = await client.getThreads(config.Version, currentUser.id, teamId, before, after, perPage, deleted, unread, since);
            if (threads.length) {
                // Mark all fetched threads as following
                threads.forEach((thread: Thread) => {
                    thread.is_following = true;
                    if (!unread) {
                        thread.loaded_in_global_threads = true;
                    }
                });

                const {models} = await processReceivedThreads(serverUrl, threads, teamId, true);
                if (models?.length) {
                    allThreadModels.push(...models);
                }
                if (threads.length === perPage) {
                    const newOptions: FetchThreadOptions = {perPage, deleted, unread};
                    if (direction === Direction.Down) {
                        const last = threads[threads.length - 1];
                        newOptions.before = last.id;
                    } else {
                        const first = threads[0];
                        newOptions.after = first.id;
                    }
                    if (pages != null && page < pages) {
                        fetchThreads(newOptions);
                    }
                }
            }
        } catch (error) {
            if (__DEV__) {
                throw error;
            }
        }
    };

    try {
        await fetchThreads(options);
    } catch (error) {
        if (__DEV__) {
            throw error;
        }

        return {error, models: allThreadModels};
    }

    return {error: false, models: allThreadModels};
}

export async function batchSyncAllUnreads(
    serverUrl: string,
    teamId: string,
    prepareRecordsOnly = false,
): Promise<{error: unknown; models?: Model[]}> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const newestThread = await getNewestThreadInTeam(operator.database, teamId, true);
    const since = newestThread ? newestThread.lastReplyAt : 0;

    const options: FetchThreadOptions = {
        perPage: General.CRT_CHUNK_SIZE,
        unread: true,
        deleted: true,
        since,
    };

    const {error, models} = await batchSyncThreads(serverUrl, teamId, options);
    if (error) {
        return {error};
    }

    if (!prepareRecordsOnly) {
        try {
            await operator.batchRecords(models);
            return {error: false, models};
        } catch (err) {
            if (__DEV__) {
                throw err;
            }
            return {error: true};
        }
    }
    return {error: false, models};
}

export async function getNewThreads(
    serverUrl: string,
    teamId: string,
    prepareRecordsOnly = false,
): Promise<{error: unknown; models?: Model[]}> {
    const options: FetchThreadOptions = {
        unread: false,
        deleted: true,
        perPage: General.CRT_CHUNK_SIZE,
    };

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const newestThread = await getNewestThreadInTeam(operator.database, teamId, false);
    options.since = newestThread ? newestThread.lastReplyAt : 0;

    let data = {
        error: false,
        models: [],
    } as {
        error: unknown;
        models?: Model[];
    };

    if (options.since === 0) {
        options.deleted = false;

        // batch fetch all unread threads
        data = await batchSyncAllUnreads(serverUrl, teamId, false);
    } else {
        // batch fetch latest updated threads (including deleted ones)
        data = await batchSyncThreads(serverUrl, teamId, options);
    }

    const {error, models} = data;

    if (error) {
        return {error};
    }

    if (models?.length && !prepareRecordsOnly) {
        try {
            await operator.batchRecords(models);
            return {error: false};
        } catch (err) {
            if (__DEV__) {
                throw err;
            }
            return {error: true};
        }
    }

    return {error: false, models};
}
