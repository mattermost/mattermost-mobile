// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {getCommonSystemValues, getCurrentTeamId, getWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {getMyTeamById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
import {emitNotificationError} from '@utils/notification';

import {deferredAppEntryActions, entry, syncOtherServers} from './common';

export async function pushNotificationEntry(serverUrl: string, notification: NotificationWithData) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const isTabletDevice = await isTablet();

    // We only reach this point if we have a channel Id in the notification payload
    const channelId = notification.payload!.channel_id!;
    const {database} = operator;
    const currentTeamId = await getCurrentTeamId(database);
    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);
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
    const myChannel = await getMyChannel(database, channelId);
    const myTeam = await getMyTeamById(database, teamId);
    const isCRTEnabled = await getIsCRTEnabled(database);

    await EphemeralStore.waitUntilScreenHasLoaded(Screens.HOME);

    let switchedToChannel = isCRTEnabled;
    if (myChannel && myTeam && !switchedToChannel) {
        await switchToChannelById(serverUrl, channelId, teamId);
        switchedToChannel = true;
    }

    const entryData = await entry(serverUrl, teamId, channelId);
    if ('error' in entryData) {
        return {error: entryData.error};
    }
    const {models, initialTeamId, initialChannelId, prefData, teamData, chData} = entryData;

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
            selectedChannelId = initialChannelId;
        }
    }

    if (!switchedToChannel) {
        if (isTabletDevice || (selectedChannelId === channelId)) {
            // Make switch again to get the missing data and make sure the team is the correct one
            switchedToChannel = true;
            switchToChannelById(serverUrl, selectedChannelId, selectedTeamId);
        } else if (selectedTeamId !== teamId || selectedChannelId !== channelId) {
            // If in the end the selected team or channel is different than the one from the notification
            // we switch again
            setCurrentTeamAndChannelId(operator, selectedTeamId, selectedChannelId);
        }
    }

    if (selectedTeamId !== teamId) {
        emitNotificationError('Team');
    } else if (selectedChannelId !== channelId) {
        emitNotificationError('Channel');
    }

    await operator.batchRecords(models);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(operator.database))!;
    const {config, license} = await getCommonSystemValues(operator.database);

    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, selectedTeamId, switchedToChannel ? selectedChannelId : undefined);
    syncOtherServers(serverUrl);

    return {userId: currentUserId};
}
