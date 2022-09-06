// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences, Screens} from '@constants';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {getCommonSystemValues, getConfig, getCurrentTeamId, getWebSocketLastDisconnected} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {logDebug} from '@utils/log';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';

import {deferredAppEntryActions, entry, handleNotificationNavigation, syncOtherServers} from './common';
import {graphQLCommon} from './gql_common';

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

    const config = await getConfig(database);
    let result;
    if (config?.FeatureFlagGraphQL === 'true') {
        result = await graphQLCommon(serverUrl, true, teamId, channelId, rootId, false, true);
        if (result.error) {
            logDebug('Error using GraphQL, trying REST', result.error);
            result = restNotificationEntry(serverUrl, teamId, channelId, rootId, isDirectChannel);
        }
    } else {
        result = restNotificationEntry(serverUrl, teamId, channelId, rootId, isDirectChannel);
    }

    syncOtherServers(serverUrl);

    return result;
}

const restNotificationEntry = async (serverUrl: string, teamId: string, channelId: string, rootId: string, isDirectChannel: boolean) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

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

    await operator.batchRecords(models);

    await handleNotificationNavigation(serverUrl, selectedChannelId, selectedTeamId, channelId, teamId, rootId);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(operator.database))!;
    const {config, license} = await getCommonSystemValues(operator.database);

    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);

    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, selectedTeamId, selectedChannelId);

    return {userId: currentUserId};
};
