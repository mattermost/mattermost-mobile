// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import {queryChannelsById, getDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues, getCommonSystemValues, getCurrentChannelId, getCurrentTeamId, getWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {deleteV1Data} from '@utils/file';
import {isTablet} from '@utils/helpers';

import {AppEntryData, AppEntryError, deferredAppEntryActions, fetchAppEntryData, syncOtherServers, teamsToRemove} from './common';

export async function appEntry(serverUrl: string, since = 0) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    // clear lastUnreadChannelId
    const removeLastUnreadChannelId = await prepareCommonSystemValues(operator, {lastUnreadChannelId: ''});
    if (removeLastUnreadChannelId) {
        operator.batchRecords(removeLastUnreadChannelId);
    }

    const tabletDevice = await isTablet();
    const currentTeamId = await getCurrentTeamId(database);
    const lastDisconnectedAt = (await getWebSocketLastDisconnected(database)) || since;
    const fetchedData = await fetchAppEntryData(serverUrl, lastDisconnectedAt, currentTeamId);
    const fetchedError = (fetchedData as AppEntryError).error;

    if (fetchedError) {
        return {error: fetchedError};
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds} = fetchedData as AppEntryData;
    const rolesData = await fetchRoles(serverUrl, teamData?.memberships, chData?.memberships, meData?.user, true);

    if (initialTeamId === currentTeamId) {
        let cId = await getCurrentChannelId(database);
        if (tabletDevice) {
            if (!cId) {
                const channel = await getDefaultChannelForTeam(database, initialTeamId);
                if (channel) {
                    cId = channel.id;
                }
            }

            switchToChannelById(serverUrl, cId, initialTeamId);
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

    const error = teamData.error || chData?.error || prefData.error || meData.error;
    return {error, userId: meData?.user?.id};
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
