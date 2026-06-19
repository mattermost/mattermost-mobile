// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {addChannelToDefaultCategory, storeCategories} from '@actions/local/category';
import {storeMyChannelsForTeam} from '@actions/local/channel';
import {storePostsForChannel} from '@actions/local/post';
import {fetchDirectChannelsInfo, fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {fetchMyTeam, fetchTeamLoad} from '@actions/remote/team';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel, getChannelById} from '@queries/servers/channel';
import {getCurrentTeamId} from '@queries/servers/system';
import {getMyTeamById, prepareMyTeams} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import {logWarning} from '@utils/log';
import {emitNotificationError} from '@utils/notification';
import {processPostsFetched} from '@utils/post';

import type {Model} from '@nozbe/watermelondb';

export const fetchNotificationData = async (serverUrl: string, notification: NotificationWithData, skipEvents = false): Promise<{error?: unknown}> => {
    const channelId = notification.payload?.channel_id;

    if (!channelId) {
        return {error: 'No channel Id was specified'};
    }

    const emitError = (type: 'Team' | 'Channel' | 'Post' | 'Connection', err: unknown = type) => {
        if (!skipEvents) {
            emitNotificationError(type);
        }
        return {error: err};
    };

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentTeamId = await getCurrentTeamId(database);
        const payloadTeamId = notification.payload?.team_id;

        // No team_id in payload → notification is for a DM/GM.
        // Use currentTeamId only as a fallback for the membership lookup.
        let teamId = payloadTeamId || currentTeamId;

        const myChannel = await getMyChannel(database, channelId);
        const myTeam = payloadTeamId ? await getMyTeamById(database, teamId) : true; // DM/GM: skip team check

        if (!myTeam || !myChannel) {
            if (payloadTeamId && EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
                const isCRTEnabled = await getIsCRTEnabled(database);
                const result = await fetchTeamLoad(serverUrl, teamId, isCRTEnabled);
                if (result.error) {
                    // fetchTeamLoad already cleaned up local data on 403.
                    return emitError('Connection', result.error);
                }
            } else {
                if (!myTeam) {
                    const teamsReq = await fetchMyTeam(serverUrl, teamId, false);
                    if (teamsReq.error || !teamsReq.memberships?.length) {
                        return emitError('Team', teamsReq.error || 'Team');
                    }
                }

                if (!myChannel) {
                    const channelReq = await fetchMyChannel(serverUrl, teamId, channelId);
                    if (channelReq.error ||
                        !channelReq.channels?.find((c) => c.id === channelId && c.delete_at === 0) ||
                        !channelReq.memberships?.find((m) => m.channel_id === channelId)) {
                        return emitError('Channel', channelReq.error || 'Channel');
                    }

                    // Re-read the channel — a GM may have been converted to a team channel
                    // and now has a team_id. Fetch its DM profile info only if still direct.
                    const channelAfterFetch = await getChannelById(database, channelId);
                    if (channelAfterFetch) {
                        if (!channelAfterFetch.teamId) {
                            fetchDirectChannelsInfo(serverUrl, [channelAfterFetch]);
                        } else if (!payloadTeamId) {
                            // Was a DM/GM in the payload but is now a team channel.
                            teamId = channelAfterFetch.teamId;
                        }
                    }
                }
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
            throw new Error('No channel Id was specified');
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

                // We need to convert the following properties from 1/0 to true/false, because
                // we validate message attachments before displaying them.
                // This is a problem from the NSJSONSerialization call in AppDelegate.mm -- there
                // is no true/false in Objective-C, only NSNumber with value 1 or 0
                if (Platform.OS === 'ios') {
                    // Convert attachment.fields.short, and attachment.actions.disabled
                    postsData.posts.forEach((post) => {
                        if (post.props?.attachments) {
                            (post.props.attachments as MessageAttachment[])?.forEach((attachment) => {
                                if (attachment.fields?.length) {
                                    // eslint-disable-next-line max-nested-callbacks
                                    attachment.fields.forEach((field) => {
                                        if (field.short !== undefined) {
                                            field.short = Boolean(field.short);
                                        }
                                    });
                                }
                                if (attachment.actions?.length) {
                                    // eslint-disable-next-line max-nested-callbacks
                                    attachment.actions.forEach((action) => {
                                        if (action.disabled !== undefined) {
                                            action.disabled = Boolean(action.disabled);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

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
            return {models};
        }
        return {models: []};
    } catch (error) {
        logWarning('backgroundNotification', error);
        return {error};
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

export const sendTestNotification = async (serverUrl: string): Promise<{status?: 'OK'; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.sendTestNotification();
        return result;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
