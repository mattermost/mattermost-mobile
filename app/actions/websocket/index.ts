// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAppInactiveSince} from '@actions/app/global';
import {markChannelAsViewed} from '@actions/local/channel';
import {dataRetentionCleanup} from '@actions/local/systems';
import {markChannelAsRead} from '@actions/remote/channel';
import {
    deferredAppEntryActions,
    entry,
    handleEntryAfterLoadNavigation,
    registerDeviceToken,
} from '@actions/remote/entry/common';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {openAllUnreadChannels} from '@actions/remote/preference';
import {autoUpdateTimezone} from '@actions/remote/user';
import {getAppInactiveSince} from '@app/queries/app/global';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {isSupportedServerCalls} from '@calls/utils';
import {Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import {getLastPostInThread} from '@queries/servers/post';
import {
    getConfig,
    getCurrentChannelId,
    getCurrentTeamId,
    getLicense,
    getWebSocketLastDisconnected,
    resetWebSocketLastDisconnected,
} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {setTeamLoading} from '@store/team_load_store';
import {isTablet} from '@utils/helpers';
import {logDebug, logInfo} from '@utils/log';

export async function handleFirstConnect(serverUrl: string) {
    registerDeviceToken(serverUrl);
    autoUpdateTimezone(serverUrl);
    return doReconnect(serverUrl);
}

export async function handleReconnect(serverUrl: string) {
    return doReconnect(serverUrl);
}

export async function handleClose(serverUrl: string, lastDisconnect: number) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    await operator.handleSystem({
        systems: [
            {
                id: SYSTEM_IDENTIFIERS.WEBSOCKET,
                value: lastDisconnect.toString(10),
            },
        ],
        prepareRecordsOnly: false,
    });
}

async function doReconnect(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return new Error('cannot find server database');
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return new Error('cannot find app database');
    }

    const {database} = operator;

    let lastDisconnectedAt = await getWebSocketLastDisconnected(database);
    if (!lastDisconnectedAt) {
        lastDisconnectedAt = await getAppInactiveSince();
    }
    setAppInactiveSince(0);
    resetWebSocketLastDisconnected(operator);

    const currentTeamId = await getCurrentTeamId(database);
    const currentChannelId = await getCurrentChannelId(database);

    setTeamLoading(serverUrl, true);
    const entryData = await entry(serverUrl, currentTeamId, currentChannelId, lastDisconnectedAt);
    if ('error' in entryData) {
        setTeamLoading(serverUrl, false);
        return entryData.error;
    }
    const {models, initialTeamId, initialChannelId, prefData, teamData, chData, gmConverted} = entryData;

    await handleEntryAfterLoadNavigation(serverUrl, teamData.memberships || [], chData?.memberships || [], currentTeamId || '', currentChannelId || '', initialTeamId, initialChannelId, gmConverted);

    const dt = Date.now();
    if (models?.length) {
        await operator.batchRecords(models, 'doReconnect');
    }

    const tabletDevice = isTablet();
    if (tabletDevice && initialChannelId === currentChannelId) {
        await markChannelAsRead(serverUrl, initialChannelId);
        markChannelAsViewed(serverUrl, initialChannelId);
    }

    logInfo('WEBSOCKET RECONNECT MODELS BATCHING TOOK', `${Date.now() - dt}ms`);
    setTeamLoading(serverUrl, false);

    await fetchPostDataIfNeeded(serverUrl);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(database))!;
    const license = await getLicense(database);
    const config = await getConfig(database);

    if (isSupportedServerCalls(config?.Version)) {
        loadConfigAndCalls(serverUrl, currentUserId);
    }

    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    openAllUnreadChannels(serverUrl);

    dataRetentionCleanup(serverUrl);

    AppsManager.refreshAppBindings(serverUrl);
    return undefined;
}

async function fetchPostDataIfNeeded(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentChannelId = await getCurrentChannelId(database);
        const isCRTEnabled = await getIsCRTEnabled(database);
        const mountedScreens = NavigationStore.getScreensInStack();
        const isChannelScreenMounted = mountedScreens.includes(Screens.CHANNEL);
        const isThreadScreenMounted = mountedScreens.includes(Screens.THREAD);
        const tabletDevice = isTablet();

        if (isCRTEnabled && isThreadScreenMounted) {
            // Fetch new posts in the thread only when CRT is enabled,
            // for non-CRT fetchPostsForChannel includes posts in the thread
            const rootId = EphemeralStore.getCurrentThreadId();
            if (rootId) {
                const lastPost = await getLastPostInThread(database, rootId);
                if (lastPost) {
                    if (lastPost) {
                        const options: FetchPaginatedThreadOptions = {};
                        options.fromCreateAt = lastPost.createAt;
                        options.fromPost = lastPost.id;
                        options.direction = 'down';
                        await fetchPostThread(serverUrl, rootId, options);
                    }
                }
            }
        }

        if (currentChannelId && (isChannelScreenMounted || tabletDevice)) {
            await fetchPostsForChannel(serverUrl, currentChannelId);
            markChannelAsRead(serverUrl, currentChannelId);
            if (!EphemeralStore.wasNotificationTapped()) {
                markChannelAsViewed(serverUrl, currentChannelId, true);
            }
            EphemeralStore.setNotificationTapped(false);
        }
    } catch (error) {
        logDebug('could not fetch needed post after WS reconnect', error);
    }
}
