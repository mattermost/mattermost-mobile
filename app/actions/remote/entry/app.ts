// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToGlobalThreads} from '@actions/local/thread';
import {switchToChannelById} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {queryChannelsById, getDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues, getCommonSystemValues, getCurrentTeamId, getWebSocketLastDisconnected, setCurrentTeamAndChannelId, getPushVerificationStatus} from '@queries/servers/system';
import {getNthLastChannelFromTeam} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {deleteV1Data} from '@utils/file';
import {isTablet} from '@utils/helpers';

import {deferredAppEntryActions, fetchAppEntryData, registerDeviceToken, syncOtherServers, teamsToRemove} from './common';

export async function appEntry(serverUrl: string, since = 0) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;

    if (!since) {
        registerDeviceToken(serverUrl);
    }

    // clear lastUnreadChannelId
    const removeLastUnreadChannelId = await prepareCommonSystemValues(operator, {lastUnreadChannelId: ''});
    if (removeLastUnreadChannelId) {
        operator.batchRecords(removeLastUnreadChannelId);
    }

    const tabletDevice = await isTablet();
    const currentTeamId = await getCurrentTeamId(database);
    const lastDisconnectedAt = (await getWebSocketLastDisconnected(database)) || since;
    const fetchedData = await fetchAppEntryData(serverUrl, lastDisconnectedAt, currentTeamId);

    if ('error' in fetchedData) {
        return {error: fetchedData.error};
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds} = fetchedData;
    const rolesData = await fetchRoles(serverUrl, teamData?.memberships, chData?.memberships, meData?.user, true, true);

    if (initialTeamId === currentTeamId) {
        if (tabletDevice) {
            const cId = await getNthLastChannelFromTeam(database, currentTeamId);
            if (cId === Screens.GLOBAL_THREADS) {
                switchToGlobalThreads(serverUrl);
            } else {
                switchToChannelById(serverUrl, cId, initialTeamId);
            }
        }
    } else {
        // Immediately set the new team as the current team in the database so that the UI
        // renders the correct team.
        let channelId = '';
        if (tabletDevice) {
            const channel = await getDefaultChannelForTeam(database, initialTeamId);
            channelId = channel?.id || '';
        }
        if (channelId) {
            switchToChannelById(serverUrl, channelId, initialTeamId);
        } else {
            setCurrentTeamAndChannelId(operator, initialTeamId, channelId);
        }
    }

    const removeTeams = await teamsToRemove(serverUrl, removeTeamIds);

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds).fetch();
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    if (rolesData.roles?.length) {
        modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));
    }

    const models = await Promise.all(modelPromises);
    await operator.batchRecords(models.flat());

    const {id: currentUserId, locale: currentUserLocale} = meData.user || (await getCurrentUser(database))!;
    const {config, license} = await getCommonSystemValues(database);
    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    if (!since) {
        // Load data from other servers
        syncOtherServers(serverUrl);
    }

    verifyPushProxy(serverUrl);

    const error = teamData.error || chData?.error || prefData.error || meData.error;
    return {error, userId: meData?.user?.id};
}

export async function verifyPushProxy(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;

    const ppVerification = await getPushVerificationStatus(database);
    if (ppVerification !== PUSH_PROXY_STATUS_UNKNOWN) {
        return;
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return;
    }

    const deviceId = await getDeviceToken(appDatabase);
    if (!deviceId) {
        return;
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (err) {
        return;
    }

    try {
        const response = await client.ping(deviceId);
        const canReceiveNotifications = response?.data?.CanReceiveNotifications;
        switch (canReceiveNotifications) {
            case PUSH_PROXY_RESPONSE_NOT_AVAILABLE:
                operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_NOT_AVAILABLE}], prepareRecordsOnly: false});
                return;
            case PUSH_PROXY_RESPONSE_UNKNOWN:
                return;
            default:
                operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_VERIFIED}], prepareRecordsOnly: false});
        }
    } catch (err) {
        // Do nothing
    }
}

export async function upgradeEntry(serverUrl: string) {
    const dt = Date.now();
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const configAndLicense = await fetchConfigAndLicense(serverUrl, false);
        const entry = await appEntry(serverUrl);

        const error = configAndLicense.error || entry.error;

        if (!error) {
            const models = await prepareCommonSystemValues(operator, {currentUserId: entry.userId});
            if (models?.length) {
                await operator.batchRecords(models);
            }
            DatabaseManager.updateServerIdentifier(serverUrl, configAndLicense.config!.DiagnosticId);
            DatabaseManager.setActiveServerDatabase(serverUrl);
            deleteV1Data();
        }

        return {error, time: Date.now() - dt};
    } catch (e) {
        return {error: e, time: Date.now() - dt};
    }
}
