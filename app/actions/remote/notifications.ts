// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {switchToChannel} from '@actions/local/channel';
import {updatePostSinceCache} from '@actions/local/notification';
import {fetchMissingSidebarInfo, fetchMyChannel, markChannelAsRead} from '@actions/remote/channel';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {fetchMyTeam} from '@actions/remote/team';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {queryChannelsById, queryMyChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryCommonSystemValues} from '@queries/servers/system';
import {queryMyTeamById} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {emitNotificationError} from '@utils/notification';

import {fetchPostsForChannel} from './post';

const fetchNotificationData = async (serverUrl: string, notification: NotificationWithData, skipEvents = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const channelId = notification.payload!.channel_id!;
        const {database} = operator;
        const system = await queryCommonSystemValues(database);
        let teamId = notification.payload?.team_id;
        let isDirectChannel = false;

        if (!teamId) {
            // If the notification payload does not have a teamId we assume is a DM/GM
            isDirectChannel = true;
            teamId = system.currentTeamId;
        }

        // To make the switch faster we determine if we already have the team & channel
        const myChannel = await queryMyChannel(database, channelId);
        const myTeam = await queryMyTeamById(database, teamId);

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
                const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
                const currentUser = await queryCurrentUser(database);
                const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], system.config, system.license);
                const channel = await queryChannelsById(database, [channelId]);
                if (channel?.length) {
                    fetchMissingSidebarInfo(serverUrl, [channel[0].toApi()], currentUser?.locale, teammateDisplayNameSetting, currentUser?.id);
                }
            }
        }

        fetchPostsForChannel(serverUrl, channelId);
        return {};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const backgroundNotification = async (serverUrl: string, notification: NotificationWithData) => {
    if (Platform.OS === 'ios') {
        updatePostSinceCache(serverUrl, notification);
    }

    await fetchNotificationData(serverUrl, notification, true);
};

export const openNotification = async (serverUrl: string, notification: NotificationWithData) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const channelId = notification.payload!.channel_id!;
        await markChannelAsRead(serverUrl, channelId);

        const {database} = operator;
        const system = await queryCommonSystemValues(database);
        const currentServerUrl = await DatabaseManager.getActiveServerUrl();
        let teamId = notification.payload?.team_id;

        if (!teamId) {
            // If the notification payload does not have a teamId we assume is a DM/GM
            teamId = system.currentTeamId;
        }

        if (currentServerUrl !== serverUrl) {
            await DatabaseManager.setActiveServerDatabase(serverUrl);
        }

        // To make the switch faster we determine if we already have the team & channel
        const myChannel = await queryMyChannel(database, channelId);
        const myTeam = await queryMyTeamById(database, teamId);

        if (myChannel && myTeam) {
            fetchPostsForChannel(serverUrl, channelId);
            switchToChannel(serverUrl, channelId, teamId);
            return {};
        }

        const result = await fetchNotificationData(serverUrl, notification);
        if (result.error) {
            return {error: result.error};
        }

        return switchToChannel(serverUrl, channelId, teamId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
