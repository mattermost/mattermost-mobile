// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markChannelAsViewed} from '@actions/local/channel';
import {dataRetentionCleanup} from '@actions/local/systems';
import {markChannelAsRead} from '@actions/remote/channel';
import {
    deferredAppEntryActions,
    entry,
    handleEntryAfterLoadNavigation,
    setExtraSessionProps,
} from '@actions/remote/entry/common';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {openAllUnreadChannels} from '@actions/remote/preference';
import {autoUpdateTimezone} from '@actions/remote/user';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {isSupportedServerCalls} from '@calls/utils';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import {updatePlaybooksVersion} from '@playbooks/actions/remote/version';
import {getActiveServerUrl} from '@queries/app/servers';
import {getLastPostInThread} from '@queries/servers/post';
import {
    getConfig,
    getCurrentChannelId,
    getCurrentTeamId,
    getLicense,
    getLastFullSync,
    setLastFullSync,
} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {setTeamLoading} from '@store/team_load_store';
import {isTablet} from '@utils/helpers';
import {logDebug, logInfo} from '@utils/log';

export async function handleFirstConnect(serverUrl: string, groupLabel?: BaseRequestGroupLabel) {
    setExtraSessionProps(serverUrl, groupLabel);
    autoUpdateTimezone(serverUrl, groupLabel);
    return doReconnect(serverUrl, groupLabel);
}

export async function handleReconnect(serverUrl: string, groupLabel: BaseRequestGroupLabel = 'WebSocket Reconnect') {
    return doReconnect(serverUrl, groupLabel);
}

async function doReconnect(serverUrl: string, groupLabel?: BaseRequestGroupLabel) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return new Error('cannot find server database');
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return new Error('cannot find app database');
    }

    const {database} = operator;

    const lastFullSync = await getLastFullSync(database);
    const now = Date.now();

    const currentTeamId = await getCurrentTeamId(database);
    const currentChannelId = await getCurrentChannelId(database);

    setTeamLoading(serverUrl, true);
    const entryData = await entry(serverUrl, currentTeamId, currentChannelId, lastFullSync, groupLabel);
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

    await setLastFullSync(operator, now);

    logInfo('WEBSOCKET RECONNECT MODELS BATCHING TOOK', `${Date.now() - dt}ms`);
    setTeamLoading(serverUrl, false);

    await fetchPostDataIfNeeded(serverUrl, groupLabel);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(database))!;
    const license = await getLicense(database);
    const config = await getConfig(database);

    // Set the version of the playbooks plugin to the systems table
    updatePlaybooksVersion(serverUrl);

    if (isSupportedServerCalls(config?.Version)) {
        loadConfigAndCalls(serverUrl, currentUserId, groupLabel);
    }

    await deferredAppEntryActions(serverUrl, lastFullSync, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId, undefined, groupLabel);

    openAllUnreadChannels(serverUrl, groupLabel);

    dataRetentionCleanup(serverUrl);

    AppsManager.refreshAppBindings(serverUrl, groupLabel);
    return undefined;
}

async function fetchPostDataIfNeeded(serverUrl: string, groupLabel?: RequestGroupLabel) {
    try {
        const isActiveServer = (await getActiveServerUrl()) === serverUrl;
        if (!isActiveServer) {
            return;
        }

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
                        await fetchPostThread(serverUrl, rootId, options, false, groupLabel);
                    }
                }
            }
        }

        if (currentChannelId && (isChannelScreenMounted || tabletDevice)) {
            await fetchPostsForChannel(serverUrl, currentChannelId, false, false, groupLabel);
            markChannelAsRead(serverUrl, currentChannelId, false, groupLabel);
            if (!EphemeralStore.wasNotificationTapped()) {
                markChannelAsViewed(serverUrl, currentChannelId, true);
            }
            EphemeralStore.setNotificationTapped(false);
        }
    } catch (error) {
        logDebug('could not fetch needed post after WS reconnect', error);
    }
}
