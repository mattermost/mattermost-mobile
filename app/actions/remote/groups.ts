// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {getTeamById} from '@queries/servers/team';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

export const fetchGroup = async (serverUrl: string, id: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client: Client = NetworkManager.getClient(serverUrl);

        const group = await client.getGroup(id);

        // Save locally
        return operator.handleGroups({groups: [group], prepareRecordsOnly: fetchOnly});
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getGroups({query, includeMemberCount: true});

        if (!response.length) {
            return [];
        }

        return operator.handleGroups({groups: response, prepareRecordsOnly: fetchOnly});
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsByNames = async (serverUrl: string, names: string[], fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForChannel = async (serverUrl: string, channelId: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToChannel(channelId);

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
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForTeam = async (serverUrl: string, teamId: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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
        return {error};
    }
};

export const fetchGroupsForMember = async (serverUrl: string, userId: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToMembership(userId);

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
        return {error};
    }
};

export const fetchFilteredTeamGroups = async (serverUrl: string, searchTerm: string, teamId: string) => {
    try {
        const groups = await fetchGroupsForTeam(serverUrl, teamId);

        if (groups && Array.isArray(groups)) {
            return groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        throw groups.error;
    } catch (error) {
        return {error};
    }
};

export const fetchFilteredChannelGroups = async (serverUrl: string, searchTerm: string, channelId: string) => {
    try {
        const groups = await fetchGroupsForChannel(serverUrl, channelId);

        if (groups && Array.isArray(groups)) {
            return groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        throw groups.error;
    } catch (error) {
        return {error};
    }
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

export const fetchGroupsForChannelIfConstrained = async (serverUrl: string, channelId: string, fetchOnly = false) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channel = await getChannelById(database, channelId);

        if (channel?.isGroupConstrained) {
            return fetchGroupsForChannel(serverUrl, channelId, fetchOnly);
        }

        return {};
    } catch (error) {
        return {error};
    }
};
