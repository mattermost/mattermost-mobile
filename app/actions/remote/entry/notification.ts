// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {fetchMyTeam} from '@actions/remote/team';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {Screens} from '@constants';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getMyChannel} from '@queries/servers/channel';
import {queryThemePreferences} from '@queries/servers/preference';
import {getCurrentTeamId} from '@queries/servers/system';
import {getMyTeamById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {emitNotificationError} from '@utils/notification';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';

import type ClientError from '@client/rest/error';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';

export async function pushNotificationEntry(serverUrl: string, notification: NotificationWithData) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    // We only reach this point if we have a channel Id in the notification payload
    const channelId = notification.payload!.channel_id!;
    const rootId = notification.payload!.root_id!;
    const {database} = operator;
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

    if (!EphemeralStore.theme) {
        // When opening the app from a push notification the theme may not be set in the EphemeralStore
        // causing the goToScreen to use the Appearance theme instead and that causes the screen background color to potentially
        // not match the theme
        const themes = await queryThemePreferences(database, teamId).fetch();
        let theme = getDefaultThemeByAppearance();
        if (themes.length) {
            theme = setThemeDefaults(JSON.parse(themes[0].value) as Theme);
        }
        updateThemeIfNeeded(theme, true);
    }

    await NavigationStore.waitUntilScreenHasLoaded(Screens.HOME);

    // To make the switch faster we determine if we already have the team & channel
    let myChannel: MyChannelModel | ChannelMembership | undefined = await getMyChannel(database, channelId);
    let myTeam: MyTeamModel | TeamMembership | undefined = await getMyTeamById(database, teamId);

    if (!myTeam) {
        const resp = await fetchMyTeam(serverUrl, teamId);
        if (resp.error) {
            if ((resp.error as ClientError).status_code === '403') {
                emitNotificationError('Team');
            } else {
                emitNotificationError('Connection');
            }
        } else {
            myTeam = resp.memberships?.[0];
        }
    }

    if (!myChannel) {
        const resp = await fetchMyChannel(serverUrl, teamId, channelId);
        if (resp.error) {
            if ((resp.error as ClientError).status_code === '403') {
                emitNotificationError('Channel');
            } else {
                emitNotificationError('Connection');
            }
        } else {
            myChannel = resp.memberships?.[0];
        }
    }

    const isCRTEnabled = await getIsCRTEnabled(database);
    const isThreadNotification = isCRTEnabled && Boolean(rootId);

    let switchedToScreen = false;
    let switchedToChannel = false;
    if (myChannel && myTeam) {
        if (isThreadNotification) {
            await fetchAndSwitchToThread(serverUrl, rootId, true);
        } else {
            switchedToChannel = true;
            await switchToChannelById(serverUrl, channelId, teamId);
        }
        switchedToScreen = true;
    }

    WebsocketManager.openAll();

    // Waiting for the screen to display fixes a race condition when fetching and storing data
    if (switchedToChannel) {
        await NavigationStore.waitUntilScreenHasLoaded(Screens.CHANNEL);
    } else if (switchedToScreen && isThreadNotification) {
        await NavigationStore.waitUntilScreenHasLoaded(Screens.THREAD);
    }

    return {};
}
