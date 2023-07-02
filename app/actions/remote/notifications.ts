// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {addChannelToDefaultCategory, storeCategories} from '@actions/local/category';
import {storeMyChannelsForTeam} from '@actions/local/channel';
import {storePostsForChannel} from '@actions/local/post';
import {fetchDirectChannelsInfo, fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {fetchMyTeam} from '@actions/remote/team';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import {getMyChannel, getChannelById} from '@queries/servers/channel';
import {getCurrentTeamId} from '@queries/servers/system';
import {getMyTeamById, prepareMyTeams} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import {logWarning} from '@utils/log';
import {emitNotificationError} from '@utils/notification';
import {processPostsFetched} from '@utils/post';

import type {Model} from '@nozbe/watermelondb';

const fetchNotificationData = async (serverUrl: string, notification: NotificationWithData, skipEvents = false) => {
    const channelId = notification.payload?.channel_id;

    if (!channelId) {
        return {error: 'No chanel Id was specified'};
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentTeamId = await getCurrentTeamId(database);
        let teamId = notification.payload?.team_id;
        let isDirectChannel = false;

        if (!teamId) {
            // If the notification payload does not have a teamId we assume is a DM/GM
            isDirectChannel = true;
            teamId = currentTeamId;
        }

        // To make the switch faster we determine if we already have the team & channel
        const myChannel = await getMyChannel(database, channelId);
        const myTeam = await getMyTeamById(database, teamId);

        if (!myTeam) {
            const teamsReq = await fetchMyTeam(serverUrl, teamId, false);
            if (teamsReq.error || !teamsReq.memberships?.length) {
                if (!skipEvents) {
                    emitNotificationError('Team');
                }
                return {error: teamsReq.error || 'Team'};
            }
        }

        if (!myChannel) {
            // We only fetch the channel that the notification belongs to
            const channelReq = await fetchMyChannel(serverUrl, teamId, channelId);
            if (channelReq.error ||
                !channelReq.channels?.find((c) => c.id === channelId && c.delete_at === 0) ||
                !channelReq.memberships?.find((m) => m.channel_id === channelId)) {
                if (!skipEvents) {
                    emitNotificationError('Channel');
                }
                return {error: channelReq.error || 'Channel'};
            }

            if (isDirectChannel) {
                const channel = await getChannelById(database, channelId);
                if (channel) {
                    fetchDirectChannelsInfo(serverUrl, [channel]);
                }
            }
        }

        if (Platform.OS === 'android') {
            // on Android we only fetched the post data on the native side
            // when the RN context is not running, thus we need to fetch the
            // data here as well
            const isCRTEnabled = await getIsCRTEnabled(database);
            const isThreadNotification = isCRTEnabled && Boolean(notification.payload?.root_id);
            if (isThreadNotification) {
                fetchPostThread(serverUrl, notification.payload!.root_id!);
            } else {
                fetchPostsForChannel(serverUrl, channelId);
            }
        }
        return {};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const backgroundNotification = async (serverUrl: string, notification: NotificationWithData) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channelId = notification.payload?.channel_id;
        let teamId = notification.payload?.team_id;
        if (!channelId) {
            throw new Error('No chanel Id was specified');
        }

        if (!teamId) {
            // If the notification payload does not have a teamId we assume is a DM/GM
            const currentTeamId = await getCurrentTeamId(database);
            teamId = currentTeamId;
        }
        if (notification.payload?.data) {
            const {data, isCRTEnabled} = notification.payload;
            const {channel, myChannel, team, myTeam, posts, users, threads} = data;
            const models: Model[] = [];

            if (posts) {
                const postsData = processPostsFetched(posts);
                const isThreadNotification = isCRTEnabled && Boolean(notification.payload.root_id);
                const actionType = isThreadNotification ? ActionType.POSTS.RECEIVED_IN_THREAD : ActionType.POSTS.RECEIVED_IN_CHANNEL;

                if (team || myTeam) {
                    const teamPromises = prepareMyTeams(operator, team ? [team] : [], myTeam ? [myTeam] : []);
                    if (teamPromises.length) {
                        const teamModels = await Promise.all(teamPromises);
                        models.push(...teamModels.flat());
                    }
                }

                await storeMyChannelsForTeam(
                    serverUrl, teamId,
                    channel ? [channel] : [],
                    myChannel ? [myChannel] : [],
                    false, isCRTEnabled,
                );

                if (data.categoryChannels?.length && channel) {
                    const {models: categoryModels} = await addChannelToDefaultCategory(serverUrl, channel, true);
                    if (categoryModels?.length) {
                        models.push(...categoryModels);
                    }
                } else if (data.categories?.categories) {
                    const {models: categoryModels} = await storeCategories(serverUrl, data.categories.categories, false, true);
                    if (categoryModels?.length) {
                        models.push(...categoryModels);
                    }
                }

                await storePostsForChannel(
                    serverUrl, channelId,
                    postsData.posts, postsData.order, postsData.previousPostId ?? '',
                    actionType, users || [],
                );

                if (isThreadNotification && threads?.length) {
                    const threadModels = await operator.handleThreads({
                        threads: threads.map((t) => ({
                            ...t,
                            lastFetchedAt: Math.max(t.post.create_at, t.post.update_at, t.post.delete_at),
                        })),
                        teamId,
                        prepareRecordsOnly: true,
                    });

                    if (threadModels.length) {
                        models.push(...threadModels);
                    }
                }
            }

            if (models.length) {
                await operator.batchRecords(models, 'backgroundNotification');
            }
        }
    } catch (error) {
        logWarning('backgroundNotification', error);
    }
};

export const openNotification = async (serverUrl: string, notification: NotificationWithData) => {
    // Wait for initial launch to kick in if needed
    await new Promise((r) => setTimeout(r, 500));

    if (EphemeralStore.getProcessingNotification() === notification.identifier) {
        return {};
    }

    EphemeralStore.setNotificationTapped(true);

    const channelId = notification.payload!.channel_id!;
    const rootId = notification.payload!.root_id!;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const isCRTEnabled = await getIsCRTEnabled(database);
        const isThreadNotification = isCRTEnabled && Boolean(rootId);

        const currentTeamId = await getCurrentTeamId(database);
        const currentServerUrl = await DatabaseManager.getActiveServerUrl();
        let teamId = notification.payload?.team_id;

        if (!teamId) {
            // If the notification payload does not have a teamId we assume is a DM/GM
            teamId = currentTeamId;
        }

        if (currentServerUrl !== serverUrl) {
            await DatabaseManager.setActiveServerDatabase(serverUrl);
        }

        // To make the switch faster we determine if we already have the team & channel
        const myChannel = await getMyChannel(database, channelId);
        const myTeam = await getMyTeamById(database, teamId);

        if (myChannel && myTeam) {
            if (isThreadNotification) {
                return fetchAndSwitchToThread(serverUrl, rootId, true);
            }
            return switchToChannelById(serverUrl, channelId, teamId);
        }

        const result = await fetchNotificationData(serverUrl, notification);
        if (result.error) {
            return {error: result.error};
        }

        if (isThreadNotification) {
            return fetchAndSwitchToThread(serverUrl, rootId, true);
        }
        return switchToChannelById(serverUrl, channelId, teamId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
