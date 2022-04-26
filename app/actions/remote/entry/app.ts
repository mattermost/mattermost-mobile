// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {gqlLogin} from '@client/graphQL/entry';
import {gqlToClientChannel, gqlToClientChannelMembership, gqlToClientPreference, gqlToClientRole, gqlToClientSidebarCategory, gqlToClientTeam, gqlToClientTeamMembership, gqlToClientUser} from '@client/graphQL/types';
import ClientError from '@client/rest/error';
import DatabaseManager from '@database/manager';
import {queryChannelsById, getDefaultChannelForTeam, queryAllChannelsForTeam} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues, getCommonSystemValues, getCurrentChannelId, getCurrentTeamId, getWebSocketLastDisconnected, setCurrentTeamAndChannelId, getConfig} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {deleteV1Data} from '@utils/file';
import {isTablet} from '@utils/helpers';

import {AppEntryData, AppEntryError, deferredAppEntryActions, fetchAppEntryData, registerDeviceToken, syncOtherServers, teamsToRemove} from './common';

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

    const config = await getConfig(database);
    if (config?.FeatureFlagGraphQL === 'true') {
        return gqlAppEntry(serverUrl, since);
    }

    return restAppEntry(serverUrl, since);
}

const gqlAppEntry = async (serverUrl: string, since = 0) => {
    console.log('using graphQL');
    const time = Date.now();
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const lastDisconnectedAt = (await getWebSocketLastDisconnected(database)) || since;

    let response;
    try {
        response = await gqlLogin(serverUrl);
    } catch (error) {
        return {error: (error as ClientError).message};
    }

    if ('error' in response) {
        return {error: response.error};
    }

    if ('errors' in response && response.errors?.length) {
        return {error: response.errors[0].message};
    }

    const fetchedData = response.data;

    const teamData = {
        teams: fetchedData.teamMembers.map((m) => gqlToClientTeam(m.team!)),
        memberships: fetchedData.teamMembers.map((m) => gqlToClientTeamMembership(m)),
    };

    const chData = {
        channels: fetchedData.channelMembers?.map((m) => gqlToClientChannel(m.channel!)),
        memberships: fetchedData.channelMembers?.map((m) => gqlToClientChannelMembership(m)),
        categories: fetchedData.teamMembers.map((m) => m.sidebarCategories!.map((c) => gqlToClientSidebarCategory(c, m.team!.id!))).flat(),
    };

    const prefData = {
        preferences: fetchedData.user?.preferences?.map((p) => gqlToClientPreference(p)),
    };

    const meData = {
        user: gqlToClientUser(fetchedData.user!),
    };

    const rolesData = {
        roles: [
            ...fetchedData.user?.roles || [],
            ...fetchedData.channelMembers?.map((m) => m.roles).flat() || [],
            ...fetchedData.teamMembers?.map((m) => m.roles).flat() || [],
        ].filter((v, i, a) => a.slice(0, i).find((v2) => v?.name === v2?.name)).map((r) => gqlToClientRole(r!)),
    };

    const removeTeamIds = [];

    const removedFromTeam = teamData.memberships?.filter((m) => m.delete_at > 0);
    if (removedFromTeam?.length) {
        removeTeamIds.push(...removedFromTeam.map((m) => m.team_id));
    }

    let initialTeamId = await getCurrentTeamId(database);
    if (teamData.teams?.length === 0) {
        // User is no longer a member of any team
        const myTeams = await queryMyTeams(database).fetch();
        removeTeamIds.push(...(myTeams?.map((myTeam) => myTeam.id) || []));
        initialTeamId = '';
    }

    const removeTeams = await teamsToRemove(serverUrl, removeTeamIds);

    const removeChannelIds: string[] = [];
    if (chData?.channels) {
        const fetchedChannelIds = chData.channels.map((channel) => channel.id);

        const channels = await queryAllChannelsForTeam(database, initialTeamId).fetch();
        for (const channel of channels) {
            if (!fetchedChannelIds.includes(channel.id)) {
                removeChannelIds.push(channel.id);
            }
        }
    }

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds).fetch();
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));

    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat());
    }

    const {id: currentUserId, locale: currentUserLocale} = meData.user || (await getCurrentUser(database))!;
    const {config, license} = await getCommonSystemValues(database);
    deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId, undefined, true);

    if (!since) {
        // Load data from other servers
        syncOtherServers(serverUrl);
    }

    console.log('Time elapsed', Date.now() - time);
    return {userId: meData?.user?.id};
};

const restAppEntry = async (serverUrl: string, since = 0) => {
    console.log('using rest');
    const time = Date.now();
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

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
    console.log('Time elapsed', Date.now() - time);
    return {error, userId: meData?.user?.id};
};

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
