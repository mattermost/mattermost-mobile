// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {entryInitialLoad} from '@actions/remote/entry/initial_load';
import {fetchPostById} from '@actions/remote/post';
import {fetchMyTeam} from '@actions/remote/team';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {queryThemePreferences} from '@queries/servers/preference';
import {getConfigValue, getCurrentTeamId} from '@queries/servers/system';
import {getMyTeamById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import {isErrorWithStatusCode} from '@utils/errors';
import {dismissKeyboard} from '@utils/keyboard';
import {emitNotificationError} from '@utils/notification';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type PostModel from '@typings/database/models/servers/post';

export async function pushNotificationEntry(serverUrl: string, notification: NotificationData, groupLabel?: BaseRequestGroupLabel) {
    // We only reach this point if we have a channel Id in the notification payload
    const channelId = notification.channel_id!;
    const rootId = notification.root_id!;

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    // Cold start from push: ensure keyboard is not stuck over the channel after navigation
    await dismissKeyboard();

    PerformanceMetricsManager.startTimeToInteraction();

    const {database} = operator;

    // Seed the experience-API flag from the DB-cached config so downstream
    // gates (blob helpers, doReconnect, etc.) reflect the last-known server
    // state. Subsequent WS reconnect will refresh config if it changed.
    const dbValue = await getConfigValue(database, 'FeatureFlagEnableExperienceAPI');
    EphemeralStore.setExperienceAPIEnabled(serverUrl, dbValue === 'true');

    const currentTeamId = await getCurrentTeamId(database);
    const currentServerUrl = await DatabaseManager.getActiveServerUrl();

    let teamId = notification.team_id;
    if (!teamId) {
        // If the notification payload does not have a teamId we assume is a DM/GM
        teamId = currentTeamId;
    }

    if (currentServerUrl !== serverUrl) {
        await DatabaseManager.setActiveServerDatabase(serverUrl);
    }

    if (!EphemeralStore.getTheme()) {
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

    let myChannel: MyChannelModel | ChannelMembership | undefined;
    let myTeam: MyTeamModel | TeamMembership | undefined;

    if (EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
        const result = await entryInitialLoad(serverUrl, teamId, channelId, undefined, undefined, groupLabel);
        if ('error' in result) {
            emitNotificationError('Connection');
        }

        // Re-query — access may have been revoked while the app was offline.
        myTeam = await getMyTeamById(database, teamId);
        myChannel = await getMyChannel(database, channelId);
    } else {
        // Legacy path: doReconnect syncs the rest, so only fetch what is missing.
        myChannel = await getMyChannel(database, channelId);
        myTeam = await getMyTeamById(database, teamId);

        if (!myTeam) {
            const resp = await fetchMyTeam(serverUrl, teamId, false, groupLabel);
            if (resp.error) {
                if (isErrorWithStatusCode(resp.error) && resp.error.status_code === 403) {
                    emitNotificationError('Team');
                } else {
                    emitNotificationError('Connection');
                }
            } else {
                myTeam = resp.memberships?.[0];
            }
        }

        if (!myChannel) {
            const resp = await fetchMyChannel(serverUrl, teamId, channelId, false, groupLabel);
            if (resp.error) {
                if (isErrorWithStatusCode(resp.error) && resp.error.status_code === 403) {
                    emitNotificationError('Channel');
                } else {
                    emitNotificationError('Connection');
                }
            } else {
                myChannel = resp.memberships?.[0];
            }
        }
    }

    const isCRTEnabled = await getIsCRTEnabled(database);
    const isThreadNotification = isCRTEnabled && Boolean(rootId);

    if (myChannel && myTeam) {
        if (isThreadNotification) {
            let post: PostModel | Post | undefined = await getPostById(database, rootId);
            if (!post) {
                const resp = await fetchPostById(serverUrl, rootId, false, groupLabel);
                post = resp.post;
            }

            const actualRootId = post && ('root_id' in post ? post.root_id : post.rootId);

            if (actualRootId) {
                PerformanceMetricsManager.setLoadTarget('THREAD');
                await fetchAndSwitchToThread(serverUrl, actualRootId, true, groupLabel);
            } else if (post) {
                PerformanceMetricsManager.setLoadTarget('THREAD');
                await fetchAndSwitchToThread(serverUrl, rootId, true, groupLabel);
            } else {
                emitNotificationError('Post');
            }
        } else {
            PerformanceMetricsManager.setLoadTarget('CHANNEL');
            await switchToChannelById(serverUrl, channelId, teamId, false, groupLabel);
        }
    }

    WebsocketManager.openAll(groupLabel);

    return {};
}
