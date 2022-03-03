// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {gqlLogin} from '@app/client/graphQL/entry';
import {gqlToClientChannel, gqlToClientChannelMembership, gqlToClientPreference, gqlToClientRole, gqlToClientSidebarCategory, gqlToClientTeam, gqlToClientTeamMembership, gqlToClientUser} from '@app/client/graphQL/types';
import DatabaseManager from '@database/manager';
import {queryAllChannelsForTeam, queryChannelsById, queryDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues, queryCommonSystemValues, queryCurrentChannelId, queryCurrentTeamId, queryWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {deleteMyTeams, queryMyTeams, queryTeamsById} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {deleteV1Data} from '@utils/file';
import {isTablet} from '@utils/helpers';

import {AppEntryData, AppEntryError, deferredAppEntryActions, fetchAppEntryData, syncOtherServers} from './common';

export const gqlAppEntry = async (serverUrl: string, since = 0) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const lastDisconnectedAt = (await queryWebSocketLastDisconnected(database)) || since;

    const {data: fetchedData, error: fetchedError} = await gqlLogin(serverUrl);

    if (!fetchedData) {
        return {error: fetchedError};
    }

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

    let initialTeamId = await queryCurrentTeamId(database);
    if (teamData.teams?.length === 0) {
        // User is no longer a member of any team
        const myTeams = await queryMyTeams(database);
        removeTeamIds.push(...(myTeams?.map((myTeam) => myTeam.id) || []));
        initialTeamId = '';
    }

    let removeTeams;
    if (removeTeamIds?.length) {
        // Immediately delete myTeams so that the UI renders only teams the user is a member of.
        removeTeams = await queryTeamsById(database, removeTeamIds);
        await deleteMyTeams(operator, removeTeams!);
    }

    const removeChannelIds: string[] = [];
    if (chData?.channels) {
        const fetchedChannelIds = chData.channels.map((channel) => channel.id);

        const channels = await queryAllChannelsForTeam(database, initialTeamId);
        for (const channel of channels) {
            if (!fetchedChannelIds.includes(channel.id)) {
                removeChannelIds.push(channel.id);
            }
        }
    }

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds);
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));

    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat());
    }

    const {id: currentUserId, locale: currentUserLocale} = meData.user || (await queryCurrentUser(database))!;
    const {config, license} = await queryCommonSystemValues(database);
    deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    if (!since) {
        // Load data from other servers
        syncOtherServers(serverUrl);
    }

    return {userId: meData?.user?.id};
};

export const appEntry = async (serverUrl: string, since = 0) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const tabletDevice = await isTablet();
    const currentTeamId = await queryCurrentTeamId(database);
    const lastDisconnectedAt = (await queryWebSocketLastDisconnected(database)) || since;
    const fetchedData = await fetchAppEntryData(serverUrl, lastDisconnectedAt, currentTeamId);
    const fetchedError = (fetchedData as AppEntryError).error;

    if (fetchedError) {
        return {error: fetchedError};
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds} = fetchedData as AppEntryData;
    const rolesData = await fetchRoles(serverUrl, teamData?.memberships, chData?.memberships, meData?.user, true);

    if (initialTeamId === currentTeamId) {
        let cId = await queryCurrentChannelId(database);
        if (tabletDevice) {
            if (!cId) {
                const channel = await queryDefaultChannelForTeam(database, initialTeamId);
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
            const channel = await queryDefaultChannelForTeam(database, initialTeamId);
            channelId = channel?.id || '';
        }
        if (channelId) {
            switchToChannelById(serverUrl, channelId, initialTeamId);
        } else {
            setCurrentTeamAndChannelId(operator, initialTeamId, channelId);
        }
    }

    let removeTeams;
    if (removeTeamIds?.length) {
        // Immediately delete myTeams so that the UI renders only teams the user is a member of.
        removeTeams = await queryTeamsById(database, removeTeamIds);
        await deleteMyTeams(operator, removeTeams!);
    }

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds);
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    if (rolesData.roles?.length) {
        modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));
    }
    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat());
    }

    const {id: currentUserId, locale: currentUserLocale} = meData.user || (await queryCurrentUser(database))!;
    const {config, license} = await queryCommonSystemValues(database);
    deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    if (!since) {
        // Load data from other servers
        syncOtherServers(serverUrl);
    }

    const error = teamData.error || chData?.error || prefData.error || meData.error;
    return {error, userId: meData?.user?.id};
};

export const upgradeEntry = async (serverUrl: string) => {
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
};
