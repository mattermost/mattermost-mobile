// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {updatePostSinceCache} from '@actions/local/notification';
import {fetchDirectChannelsInfo, fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import {fetchMyTeam} from '@actions/remote/team';
import DatabaseManager from '@database/manager';
import {getMyChannel, getChannelById} from '@queries/servers/channel';
import {getCommonSystemValues, getWebSocketLastDisconnected} from '@queries/servers/system';
import {getMyTeamById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {emitNotificationError} from '@utils/notification';

const fetchNotificationData = async (serverUrl: string, notification: NotificationWithData, skipEvents = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const channelId = notification.payload?.channel_id;

        if (!channelId) {
            return {error: 'No chanel Id was specified'};
        }

        const {database} = operator;
        const system = await getCommonSystemValues(database);
        let teamId = notification.payload?.team_id;
        let isDirectChannel = false;

        if (!teamId) {
            // If the notification payload does not have a teamId we assume is a DM/GM
            isDirectChannel = true;
            teamId = system.currentTeamId;
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

        return {};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const backgroundNotification = async (serverUrl: string, notification: NotificationWithData) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    const isCRTEnabled = await getIsCRTEnabled(database);
    if (isCRTEnabled && notification.payload?.root_id) {
        return;
    }

    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);
    if (lastDisconnectedAt) {
        if (Platform.OS === 'ios') {
            updatePostSinceCache(serverUrl, notification);
        }

        await fetchNotificationData(serverUrl, notification, true);
    }
};

export const openNotification = async (serverUrl: string, notification: NotificationWithData) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const channelId = notification.payload!.channel_id!;
        const isCRTEnabled = await getIsCRTEnabled(database);
        if (isCRTEnabled && notification.payload?.root_id) {
            return {error: 'Opening CRT notifications not implemented yet'};
        }
        const system = await getCommonSystemValues(database);
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
        const myChannel = await getMyChannel(database, channelId);
        const myTeam = await getMyTeamById(database, teamId);

        if (myChannel && myTeam) {
            return switchToChannelById(serverUrl, channelId, teamId);
        }

        const result = await fetchNotificationData(serverUrl, notification);
        if (result.error) {
            return {error: result.error};
        }

        return switchToChannelById(serverUrl, channelId, teamId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
