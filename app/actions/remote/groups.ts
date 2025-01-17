// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {getLicense} from '@queries/servers/system';
import {getTeamById} from '@queries/servers/team';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string, fetchOnly = false) => {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const license = await getLicense(database);
        if (!license || license.IsLicensed !== 'true') {
            return [];
        }

        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getGroups({query, includeMemberCount: true});

        if (!response.length) {
            return [];
        }

        return operator.handleGroups({groups: response, prepareRecordsOnly: fetchOnly});
    } catch (error) {
        logDebug('error on fetchGroupsForAutocomplete', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchGroupsByNames = async (serverUrl: string, names: string[], fetchOnly = false) => {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const license = await getLicense(database);
        if (!license || license.IsLicensed !== 'true') {
            return [];
        }

        const client: Client = NetworkManager.getClient(serverUrl);
        const promises: Array <Promise<Group[]>> = [];

        names.forEach((name) => {
            promises.push(client.getGroups({query: name}));
        });

        const groups = (await Promise.all(promises)).flat();

        // Save locally
        if (!groups.length) {
            return [];
        }

        return operator.handleGroups({groups, prepareRecordsOnly: fetchOnly});
    } catch (error) {
        logDebug('error on fetchGroupsByNames', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchGroupsForChannel = async (serverUrl: string, channelId: string, fetchOnly = false, groupLabel?: RequestGroupLabel) => {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const license = await getLicense(database);
        if (!license || license.IsLicensed !== 'true') {
            return {groups: [], groupChannels: []};
        }

        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToChannel(channelId, undefined, groupLabel);

        if (!response.groups.length) {
            return {groups: [], groupChannels: []};
        }

        const [groups, groupChannels] = await Promise.all([
            operator.handleGroups({groups: response.groups, prepareRecordsOnly: true}),
            operator.handleGroupChannelsForChannel({groups: response.groups, channelId, prepareRecordsOnly: true}),
        ]);

        if (!fetchOnly) {
            await operator.batchRecords([...groups, ...groupChannels], 'fetchGroupsForChannel');
        }

        return {groups, groupChannels};
    } catch (error) {
        logDebug('error on fetchGroupsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchGroupsForTeam = async (serverUrl: string, teamId: string, fetchOnly = false) => {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const license = await getLicense(database);
        if (!license || license.IsLicensed !== 'true') {
            return {groups: [], groupTeams: []};
        }

        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToTeam(teamId);

        if (!response.groups.length) {
            return {groups: [], groupTeams: []};
        }

        const [groups, groupTeams] = await Promise.all([
            operator.handleGroups({groups: response.groups, prepareRecordsOnly: true}),
            operator.handleGroupTeamsForTeam({groups: response.groups, teamId, prepareRecordsOnly: true}),
        ]);

        if (!fetchOnly) {
            await operator.batchRecords([...groups, ...groupTeams], 'fetchGroupsForTeam');
        }

        return {groups, groupTeams};
    } catch (error) {
        logDebug('error on fetchGroupsForTeam', getFullErrorMessage(error));
        return {error};
    }
};

export const fetchGroupsForMember = async (serverUrl: string, userId: string, fetchOnly = false, groupLabel?: RequestGroupLabel) => {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const license = await getLicense(database);
        if (!license || license.IsLicensed !== 'true') {
            return {groups: [], groupMemberships: []};
        }

        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToMembership(userId, false, groupLabel);

        if (!response.length) {
            return {groups: [], groupMemberships: []};
        }

        const [groups, groupMemberships] = await Promise.all([
            operator.handleGroups({groups: response, prepareRecordsOnly: true}),
            operator.handleGroupMembershipsForMember({groups: response, userId, prepareRecordsOnly: true}),
        ]);

        if (!fetchOnly) {
            await operator.batchRecords([...groups, ...groupMemberships], 'fetchGroupsForMember');
        }

        return {groups, groupMemberships};
    } catch (error) {
        logDebug('error on fetchGroupsForMember', getFullErrorMessage(error));
        return {error};
    }
};

export const fetchFilteredTeamGroups = async (serverUrl: string, searchTerm: string, teamId: string) => {
    const res = await fetchGroupsForTeam(serverUrl, teamId);
    if ('error' in res) {
        return {error: res.error};
    }
    return res.groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
};

export const fetchFilteredChannelGroups = async (serverUrl: string, searchTerm: string, channelId: string) => {
    const res = await fetchGroupsForChannel(serverUrl, channelId);
    if ('error' in res) {
        return {error: res.error};
    }
    return res.groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
};

export const fetchGroupsForTeamIfConstrained = async (serverUrl: string, teamId: string, fetchOnly = false) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const team = await getTeamById(database, teamId);

        if (team?.isGroupConstrained) {
            return fetchGroupsForTeam(serverUrl, teamId, fetchOnly);
        }

        return {};
    } catch (error) {
        return {error};
    }
};

export const fetchGroupsForChannelIfConstrained = async (serverUrl: string, channelId: string, fetchOnly = false, groupLabel?: RequestGroupLabel) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channel = await getChannelById(database, channelId);

        if (channel?.isGroupConstrained) {
            return fetchGroupsForChannel(serverUrl, channelId, fetchOnly, groupLabel);
        }

        return {};
    } catch (error) {
        return {error};
    }
};
