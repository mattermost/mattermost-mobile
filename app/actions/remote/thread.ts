// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, markThreadAsViewed, processReceivedThreads, switchToThread, updateTeamThreadsSync, updateThread} from '@actions/local/thread';
import {fetchPostThread} from '@actions/remote/post';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import PushNotifications from '@init/push_notifications';
import AppsManager from '@managers/apps_manager';
import NetworkManager from '@managers/network_manager';
import {getPostById} from '@queries/servers/post';
import {getConfigValue, getCurrentChannelId, getCurrentTeamId} from '@queries/servers/system';
import {getIsCRTEnabled, getThreadById, getTeamThreadsSyncData} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {showThreadFollowingSnackbar} from '@utils/snack_bar';
import {getThreadsListEdges} from '@utils/thread';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type Model from '@nozbe/watermelondb/Model';

type FetchThreadsOptions = {
    before?: string;
    after?: string;
    perPage?: number;
    deleted?: boolean;
    unread?: boolean;
    since?: number;
    totalsOnly?: boolean;
};

enum Direction {
    Up,
    Down,
}

export const fetchAndSwitchToThread = async (serverUrl: string, rootId: string, isFromNotification = false) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    // Load thread before we open to the thread modal
    fetchPostThread(serverUrl, rootId);

    // Mark thread as read
    const isCRTEnabled = await getIsCRTEnabled(database);
    if (isCRTEnabled) {
        const post = await getPostById(database, rootId);
        if (post) {
            const thread = await getThreadById(database, rootId);
            if (thread?.isFollowing) {
                markThreadAsViewed(serverUrl, thread.id);
            }
        }
    }

    await switchToThread(serverUrl, rootId, isFromNotification);

    if (await AppsManager.isAppsEnabled(serverUrl)) {
        // Getting the post again in case we didn't had it at the beginning
        const post = await getPostById(database, rootId);
        const currentChannelId = await getCurrentChannelId(database);

        if (post) {
            if (currentChannelId === post?.channelId) {
                AppsManager.copyMainBindingsToThread(serverUrl, currentChannelId);
            } else {
                AppsManager.fetchBindings(serverUrl, post.channelId, true);
            }
        }
    }

    return {};
};

export const fetchThread = async (serverUrl: string, teamId: string, threadId: string, extended?: boolean) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const thread = await client.getThread('me', teamId, threadId, extended);

        await processReceivedThreads(serverUrl, [thread], teamId);

        return {data: thread};
    } catch (error) {
        logDebug('error on fetchThread', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const updateTeamThreadsAsRead = async (serverUrl: string, teamId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.updateTeamThreadsAsRead('me', teamId);

        // Update locally
        await markTeamThreadsAsRead(serverUrl, teamId);

        return {data};
    } catch (error) {
        logDebug('error on updateTeamThreadsAsRead', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const markThreadAsRead = async (serverUrl: string, teamId: string | undefined, threadId: string, updateLastViewed = true) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const timestamp = Date.now();

        // DM/GM doesn't have a teamId, so we pass the current team id
        let threadTeamId = teamId;
        if (!threadTeamId) {
            threadTeamId = await getCurrentTeamId(database);
        }
        const data = await client.markThreadAsRead('me', threadTeamId, threadId, timestamp);

        // Update locally
        await updateThread(serverUrl, threadId, {
            last_viewed_at: updateLastViewed ? timestamp : undefined,
            unread_replies: 0,
            unread_mentions: 0,
        });

        const isCRTEnabled = await getIsCRTEnabled(database);
        const post = await getPostById(database, threadId);
        if (post) {
            if (isCRTEnabled) {
                PushNotifications.removeThreadNotifications(serverUrl, threadId);
            } else {
                PushNotifications.removeChannelNotifications(serverUrl, post.channelId);
            }
        }

        return {data};
    } catch (error) {
        logDebug('error on markThreadAsRead', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const markThreadAsUnread = async (serverUrl: string, teamId: string, threadId: string, postId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // DM/GM doesn't have a teamId, so we pass the current team id
        let threadTeamId = teamId;
        if (!threadTeamId) {
            threadTeamId = await getCurrentTeamId(database);
        }

        const data = await client.markThreadAsUnread('me', threadTeamId, threadId, postId);

        // Update locally
        const post = await getPostById(database, postId);
        if (post) {
            await updateThread(serverUrl, threadId, {
                last_viewed_at: post.createAt - 1,
                viewed_at: post.createAt - 1,
            });
        }

        return {data};
    } catch (error) {
        logDebug('error on markThreadAsUnread', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const updateThreadFollowing = async (serverUrl: string, teamId: string, threadId: string, state: boolean, showSnackBar: boolean) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // DM/GM doesn't have a teamId, so we pass the current team id
        let threadTeamId = teamId;
        if (!threadTeamId) {
            threadTeamId = await getCurrentTeamId(database);
        }

        const data = await client.updateThreadFollow('me', threadTeamId, threadId, state);

        // Update locally
        await updateThread(serverUrl, threadId, {is_following: state});

        if (showSnackBar) {
            const onUndo = () => updateThreadFollowing(serverUrl, teamId, threadId, !state, false);
            showThreadFollowingSnackbar(state, onUndo);
        }

        return {data};
    } catch (error) {
        logDebug('error on updateThreadFollowing', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchThreads = async (
    serverUrl: string,
    teamId: string,
    options: FetchThreadsOptions,
    direction?: Direction,
    pages?: number,
) => {
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

    const fetchDirection = direction ?? Direction.Up;

    const currentUser = await getCurrentUser(database);
    if (!currentUser) {
        return {error: 'currentUser not found'};
    }

    const version = await getConfigValue(database, 'Version');
    const threadsData: Thread[] = [];

    let currentPage = 0;
    const fetchThreadsFunc = async (opts: FetchThreadsOptions) => {
        const {before, after, perPage = General.CRT_CHUNK_SIZE, deleted, unread, since} = opts;

        currentPage++;
        const {threads} = await client.getThreads(currentUser.id, teamId, before, after, perPage, deleted, unread, since, false, version);
        if (threads.length) {
            // Mark all fetched threads as following
            for (const thread of threads) {
                thread.is_following = thread.is_following ?? true;
            }

            threadsData.push(...threads);

            if (threads.length === perPage && (pages == null || currentPage < pages!)) {
                const newOptions: FetchThreadsOptions = {perPage, deleted, unread};
                if (fetchDirection === Direction.Down) {
                    const last = threads[threads.length - 1];
                    newOptions.before = last.id;
                } else {
                    const first = threads[0];
                    newOptions.after = first.id;
                }
                await fetchThreadsFunc(newOptions);
            }
        }
    };

    try {
        await fetchThreadsFunc(options);
    } catch (error) {
        logDebug('error on fetchThreads', getFullErrorMessage(error));
        if (__DEV__) {
            throw error;
        }
        return {error};
    }

    return {error: false, threads: threadsData};
};

export const syncTeamThreads = async (serverUrl: string, teamId: string, prepareRecordsOnly = false) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const syncData = await getTeamThreadsSyncData(database, teamId);
        const syncDataUpdate = {
            id: teamId,
        } as TeamThreadsSync;

        const threads: Thread[] = [];

        /**
         * If Syncing for the first time,
         *     - Get all unread threads to show the right badges
         *     - Get latest threads to show by default in the global threads screen
         * Else
         *     - Get all threads since last sync
         */
        if (!syncData || !syncData?.latest) {
            const [allUnreadThreads, latestThreads] = await Promise.all([
                fetchThreads(
                    serverUrl,
                    teamId,
                    {unread: true},
                    Direction.Down,
                ),
                fetchThreads(
                    serverUrl,
                    teamId,
                    {},
                    undefined,
                    1,
                ),
            ]);
            if (allUnreadThreads.error || latestThreads.error) {
                return {error: allUnreadThreads.error || latestThreads.error};
            }
            if (latestThreads.threads?.length) {
                // We are fetching the threads for the first time. We get "latest" and "earliest" values.
                const {earliestThread, latestThread} = getThreadsListEdges(latestThreads.threads);
                syncDataUpdate.latest = latestThread.last_reply_at;
                syncDataUpdate.earliest = earliestThread.last_reply_at;

                threads.push(...latestThreads.threads);
            }
            if (allUnreadThreads.threads?.length) {
                threads.push(...allUnreadThreads.threads);
            }
        } else {
            const allNewThreads = await fetchThreads(
                serverUrl,
                teamId,
                {deleted: true, since: syncData.latest + 1},
            );
            if (allNewThreads.error) {
                return {error: allNewThreads.error};
            }
            if (allNewThreads.threads?.length) {
                // As we are syncing, we get all new threads and we will update the "latest" value.
                const {latestThread} = getThreadsListEdges(allNewThreads.threads);
                syncDataUpdate.latest = latestThread.last_reply_at;

                threads.push(...allNewThreads.threads);
            }
        }

        const models: Model[] = [];

        if (threads.length) {
            const {error, models: threadModels = []} = await processReceivedThreads(serverUrl, threads, teamId, true);
            if (error) {
                return {error};
            }

            if (threadModels?.length) {
                models.push(...threadModels);
            }

            if (syncDataUpdate.earliest || syncDataUpdate.latest) {
                const {models: updateModels} = await updateTeamThreadsSync(serverUrl, syncDataUpdate, true);
                if (updateModels?.length) {
                    models.push(...updateModels);
                }
            }

            if (!prepareRecordsOnly && models?.length) {
                try {
                    await operator.batchRecords(models, 'syncTeamThreads');
                } catch (err) {
                    if (__DEV__) {
                        throw err;
                    }
                    return {error: err};
                }
            }
        }

        return {error: false, models};
    } catch (error) {
        return {error};
    }
};

export const loadEarlierThreads = async (serverUrl: string, teamId: string, lastThreadId: string, prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        /*
         * - We will fetch one page of old threads
         * - Update the sync data with the earliest thread last_reply_at timestamp
         */
        const fetchedThreads = await fetchThreads(
            serverUrl,
            teamId,
            {
                before: lastThreadId,
            },
            undefined,
            1,
        );
        if (fetchedThreads.error) {
            return {error: fetchedThreads.error};
        }

        const models: Model[] = [];
        const threads = fetchedThreads.threads || [];

        if (threads?.length) {
            const {error, models: threadModels = []} = await processReceivedThreads(serverUrl, threads, teamId, true);
            if (error) {
                return {error};
            }

            if (threadModels?.length) {
                models.push(...threadModels);
            }

            const {earliestThread} = getThreadsListEdges(threads);
            const syncDataUpdate = {
                id: teamId,
                earliest: earliestThread.last_reply_at,
            } as TeamThreadsSync;
            const {models: updateModels} = await updateTeamThreadsSync(serverUrl, syncDataUpdate, true);
            if (updateModels?.length) {
                models.push(...updateModels);
            }

            if (!prepareRecordsOnly && models?.length) {
                try {
                    await operator.batchRecords(models, 'loadEarlierThreads');
                } catch (err) {
                    if (__DEV__) {
                        throw err;
                    }
                    return {error: err};
                }
            }
        }

        return {models, threads};
    } catch (error) {
        return {error};
    }
};
