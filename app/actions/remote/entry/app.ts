// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dataRetentionCleanup, setLastServerVersionCheck} from '@actions/local/systems';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import {prepareCommonSystemValues, getCurrentTeamId, getWebSocketLastDisconnected, getCurrentChannelId, getConfig, getLicense} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {setTeamLoading} from '@store/team_load_store';
import {deleteV1Data} from '@utils/file';
import {isTablet} from '@utils/helpers';
import {logInfo} from '@utils/log';

import {handleEntryAfterLoadNavigation, registerDeviceToken, syncOtherServers, verifyPushProxy} from './common';
import {deferredAppEntryActions, entry} from './gql_common';

export async function appEntry(serverUrl: string, since = 0, isUpgrade = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    if (!since) {
        registerDeviceToken(serverUrl);
        if (Object.keys(DatabaseManager.serverDatabases).length === 1) {
            await setLastServerVersionCheck(serverUrl, true);
        }
    }

    // Run data retention cleanup
    await dataRetentionCleanup(serverUrl);

    // clear lastUnreadChannelId
    const removeLastUnreadChannelId = await prepareCommonSystemValues(operator, {lastUnreadChannelId: ''});
    if (removeLastUnreadChannelId) {
        await operator.batchRecords(removeLastUnreadChannelId, 'appEntry - removeLastUnreadChannelId');
    }

    const {database} = operator;

    const currentTeamId = await getCurrentTeamId(database);
    const currentChannelId = await getCurrentChannelId(database);
    const lastDisconnectedAt = (await getWebSocketLastDisconnected(database)) || since;

    setTeamLoading(serverUrl, true);
    const entryData = await entry(serverUrl, currentTeamId, currentChannelId, since);
    if ('error' in entryData) {
        setTeamLoading(serverUrl, false);
        return {error: entryData.error};
    }

    const {models, initialTeamId, initialChannelId, prefData, teamData, chData, meData} = entryData;
    if (isUpgrade && meData?.user) {
        const isTabletDevice = await isTablet();
        const me = await prepareCommonSystemValues(operator, {
            currentUserId: meData.user.id,
            currentTeamId: initialTeamId,
            currentChannelId: isTabletDevice ? initialChannelId : undefined,
        });
        if (me?.length) {
            await operator.batchRecords(me, 'appEntry - upgrade store me');
        }
    }

    await handleEntryAfterLoadNavigation(serverUrl, teamData.memberships || [], chData?.memberships || [], currentTeamId, currentChannelId, initialTeamId, initialChannelId);

    const dt = Date.now();
    await operator.batchRecords(models, 'appEntry');
    logInfo('ENTRY MODELS BATCHING TOOK', `${Date.now() - dt}ms`);
    setTeamLoading(serverUrl, false);

    const {id: currentUserId, locale: currentUserLocale} = meData?.user || (await getCurrentUser(database))!;
    const config = await getConfig(database);
    const license = await getLicense(database);
    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    if (!since) {
        // Load data from other servers
        syncOtherServers(serverUrl);
    }

    verifyPushProxy(serverUrl);

    return {userId: currentUserId};
}

export async function upgradeEntry(serverUrl: string) {
    const dt = Date.now();

    try {
        const configAndLicense = await fetchConfigAndLicense(serverUrl, false);
        const entryData = await appEntry(serverUrl, 0, true);
        const error = configAndLicense.error || entryData.error;

        if (!error) {
            await DatabaseManager.updateServerIdentifier(serverUrl, configAndLicense.config!.DiagnosticId);
            await DatabaseManager.setActiveServerDatabase(serverUrl);
            deleteV1Data();
        }

        return {error, time: Date.now() - dt};
    } catch (e) {
        return {error: e, time: Date.now() - dt};
    }
}
