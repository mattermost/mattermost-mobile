// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {Preferences, Screens} from '@constants';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {getConfig, getCurrentTeamId, getLicense, getWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {getMyTeamById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {isTablet} from '@utils/helpers';
import {emitNotificationError} from '@utils/notification';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';

import {syncOtherServers} from './common';
import {deferredAppEntryActions, entry} from './gql_common';

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
    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);

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

    if (!EphemeralStore.theme) {
        // When opening the app from a push notification the theme may not be set in the EphemeralStore
        // causing the goToScreen to use the Appearance theme instead and that causes the screen background color to potentially
        // not match the theme
        const themes = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME, teamId).fetch();
        let theme = getDefaultThemeByAppearance();
        if (themes.length) {
            theme = setThemeDefaults(JSON.parse(themes[0].value) as Theme);
        }
        updateThemeIfNeeded(theme, true);
    }

    await NavigationStore.waitUntilScreenHasLoaded(Screens.HOME);

    // To make the switch faster we determine if we already have the team & channel
    const myChannel = await getMyChannel(database, channelId);
    const myTeam = await getMyTeamById(database, teamId);

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

    if (!switchedToScreen) {
        const isTabletDevice = await isTablet();
        if (isTabletDevice || (channelId === selectedChannelId)) {
            // Make switch again to get the missing data and make sure the team is the correct one
            switchedToScreen = true;
            if (isThreadNotification) {
                await fetchAndSwitchToThread(serverUrl, rootId, true);
            } else {
                switchedToChannel = true;
                await switchToChannelById(serverUrl, channelId, teamId);
            }
        } else if (teamId !== selectedTeamId || channelId !== selectedChannelId) {
            // If in the end the selected team or channel is different than the one from the notification
            // we switch again
            await setCurrentTeamAndChannelId(operator, selectedTeamId, selectedChannelId);
        }
    }

    if (teamId !== selectedTeamId) {
        emitNotificationError('Team');
    } else if (channelId !== selectedChannelId) {
        emitNotificationError('Channel');
    }

    // Waiting for the screen to display fixes a race condition when fetching and storing data
    if (switchedToChannel) {
        await NavigationStore.waitUntilScreenHasLoaded(Screens.CHANNEL);
    } else if (switchedToScreen && isThreadNotification) {
        await NavigationStore.waitUntilScreenHasLoaded(Screens.THREAD);
    }

    await operator.batchRecords(models);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(operator.database))!;
    const config = await getConfig(database);
    const license = await getLicense(database);

    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, selectedTeamId, selectedChannelId);

    syncOtherServers(serverUrl);

    return {userId: currentUserId};
}
