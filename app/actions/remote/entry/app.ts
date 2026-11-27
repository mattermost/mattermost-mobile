// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setLastServerVersionCheck} from '@actions/local/systems';
import {fetchMyChannel, switchToChannelById, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchMyTeam} from '@actions/remote/team';
import {refetchCurrentUser} from '@actions/remote/user';
import {fetchAgents} from '@agents/actions/remote/agents';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentUserId, prepareCommonSystemValues} from '@queries/servers/system';
import {NavigationStore} from '@store/navigation_store';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {verifyPushProxy} from './common';

import type {Database} from '@nozbe/watermelondb';

export type RestoreChannel = {teamId: string; channelId: string};

const GLOBAL_SCREENS = new Set<string>([Screens.GLOBAL_THREADS, Screens.GLOBAL_DRAFTS]);
const HOME_SCREENS = new Set<string | undefined>([undefined, Screens.HOME, Screens.CHANNEL_LIST]);
const NO_CHANNEL_FETCH: MyChannelsRequest = {};

async function switchToRestoredChannel(serverUrl: string, database: Database, {teamId, channelId}: RestoreChannel) {
    const [teamResult, channelResult] = await Promise.all([
        fetchMyTeam(serverUrl, teamId),
        GLOBAL_SCREENS.has(channelId) ? NO_CHANNEL_FETCH : fetchMyChannel(serverUrl, teamId, channelId),
    ]);

    const fetchError = teamResult.error ?? channelResult.error;
    if (fetchError) {
        logDebug('appEntry: last viewed channel unavailable, landing on home', channelId, getFullErrorMessage(fetchError));
        return;
    }

    // Home renders before the fetches return, so don't pull the user out of a screen or channel they already picked
    if (await getCurrentChannelId(database) || !HOME_SCREENS.has(NavigationStore.getVisibleScreen())) {
        logDebug('appEntry: user navigated before the last viewed channel was restored');
        return;
    }

    await switchToChannelById(serverUrl, channelId, teamId);
}

export async function appEntry(serverUrl: string, restoreChannel?: RestoreChannel) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        PerformanceMetricsManager.startTimeToInteraction();

        if (Object.keys(DatabaseManager.serverDatabases).length === 1) {
            await setLastServerVersionCheck(serverUrl, true);
        }

        // clear lastUnreadChannelId
        const removeLastUnreadChannelId = await prepareCommonSystemValues(operator, {lastUnreadChannelId: ''});
        if (removeLastUnreadChannelId) {
            await operator.batchRecords(removeLastUnreadChannelId, 'appEntry - removeLastUnreadChannelId');
        }

        // during cold start while on zero persistence mode DB is empty and we need to
        // seed the current user before WS connects
        const existingUserId = await getCurrentUserId(database);
        if (!existingUserId) {
            const {currentUserId: seededUserId} = await refetchCurrentUser(serverUrl, undefined);
            if (!seededUserId) {
                throw new Error('appEntry: failed to seed current user');
            }
        }

        if (restoreChannel) {
            await switchToRestoredChannel(serverUrl, database, restoreChannel);
        }

        WebsocketManager.openAll('Cold Start');

        verifyPushProxy(serverUrl);

        // Fetch agents to determine if AI features are available
        fetchAgents(serverUrl);

        return {};
    } catch (error) {
        logError('appEntry', serverUrl, getFullErrorMessage(error));
        return {error};
    }
}
