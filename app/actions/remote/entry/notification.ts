// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {switchToChannel} from '@actions/local/channel';
import {markChannelAsRead} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {queryChannelsById, queryDefaultChannelForTeam, queryMyChannel} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {queryCommonSystemValues, queryCurrentTeamId, queryWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {deleteMyTeams, queryMyTeamById, queryTeamsById} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
import {emitNotificationError} from '@utils/notification';

import {AppEntryData, AppEntryError, deferredAppEntryActions, fetchAppEntryData} from './common';

export const pushNotificationEntry = async (serverUrl: string, notification: NotificationWithData) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    // We only reach this point if we have a channel Id in the notification payload
    const channelId = notification.payload!.channel_id!;
    const isTabletDevice = await isTablet();
    const {database} = operator;
    const currentTeamId = await queryCurrentTeamId(database);
    const lastDisconnectedAt = await queryWebSocketLastDisconnected(database);
    const currentServerUrl = await DatabaseManager.getActiveServerUrl();
    let isDirectChannel = false;

    let teamId = notification.payload?.team_id;
    if (!teamId) {
        // If the notification payload does not have a teamId we assume is a DM/GM
        isDirectChannel = true;
        teamId = currentTeamId;
    }

    if (currentServerUrl !== serverUrl) {
        await DatabaseManager.setActiveServerDatabase(serverUrl);
    }

    // To make the switch faster we determine if we already have the team & channel
    const myChannel = await queryMyChannel(database, channelId);
    const myTeam = await queryMyTeamById(database, teamId);
    let switchedToTeamAndChanel = false;
    if (myChannel && myTeam) {
        switchedToTeamAndChanel = true;
        await EphemeralStore.waitUntilScreenHasLoaded(Screens.HOME);
        markChannelAsRead(serverUrl, channelId);
        await switchToChannel(serverUrl, channelId, teamId);
    }

    const fetchedData = await fetchAppEntryData(serverUrl, lastDisconnectedAt, teamId);
    const fetchedError = (fetchedData as AppEntryError).error;

    if (fetchedError) {
        return {error: fetchedError};
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds} = fetchedData as AppEntryData;
    const rolesData = await fetchRoles(serverUrl, teamData?.memberships, chData?.memberships, meData?.user, true);

    // There is a chance that after the above request returns
    // the user is no longer part of the team or channel
    // that triggered the notification (rare but possible)
    let selectedTeamId = teamId;
    let selectedChannelId = channelId;
    if (initialTeamId !== teamId) {
        // We are no longer a part of the team that the notification belongs to
        // Immediately set the new team as the current team in the database so that the UI
        // renders the correct team.

        selectedTeamId = initialTeamId;
        if (!isDirectChannel) {
            if (isTabletDevice) {
                const channel = await queryDefaultChannelForTeam(operator.database, selectedTeamId);
                selectedChannelId = channel?.id || '';
            } else {
                selectedChannelId = '';
            }
        }
    }

    if (removeChannelIds?.includes(channelId)) {
        // We are no longer a part of the channel that the notification belongs to
        // Immediately set the new channel as the current channel in the database so that the UI
        // renders the correct channel.

        if (isTabletDevice) {
            const channel = await queryDefaultChannelForTeam(operator.database, selectedTeamId);
            selectedChannelId = channel?.id || '';
        } else {
            selectedChannelId = '';
        }
    }

    // If in the end the selected team or channel is different than the one from the notification
    // we switch again
    if (selectedTeamId !== teamId || selectedChannelId !== channelId) {
        setCurrentTeamAndChannelId(operator, selectedTeamId, selectedChannelId);
    }

    if (selectedTeamId !== teamId) {
        emitNotificationError('Team');
    } else if (selectedChannelId === channelId) {
        if (!switchedToTeamAndChanel) {
            markChannelAsRead(serverUrl, channelId);
            switchToChannel(serverUrl, channelId, teamId);
        }
    } else {
        emitNotificationError('Channel');
    }

    let removeTeams;
    if (removeTeamIds?.length) {
        // Immediately delete myTeams so that the UI renders only teams the user is a member of.
        removeTeams = await queryTeamsById(operator.database, removeTeamIds);
        await deleteMyTeams(operator, removeTeams!);
    }

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(operator.database, removeChannelIds);
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    if (rolesData.roles?.length) {
        modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));
    }

    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat() as Model[]);
    }

    const {id: currentUserId, locale: currentUserLocale} = meData.user || (await queryCurrentUser(operator.database))!;
    const {config, license} = await queryCommonSystemValues(operator.database);

    deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, selectedTeamId, selectedChannelId);
    const error = teamData.error || chData?.error || prefData.error || meData.error;
    return {error, userId: meData?.user?.id};
};
