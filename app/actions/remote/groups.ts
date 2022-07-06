// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '@client/rest';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {forceLogoutIfNecessary} from './session';

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getGroups(query);

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
            promises.push(client.getGroups(name));
        });

        const groups = (await Promise.all(promises)).flat();

        // Save locally
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

        return operator.handleGroups({groups: response.groups, prepareRecordsOnly: fetchOnly});
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

        return operator.handleGroups({groups: response.groups, prepareRecordsOnly: fetchOnly});
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForMember = async (serverUrl: string, userId: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToMembership(userId);

        const groups = await operator.handleGroups({groups: response, prepareRecordsOnly: true});
        const groupMemberships = await operator.handleGroupMembershipsForMember({groups: response, userId, prepareRecordsOnly: true});

        if (!fetchOnly) {
            await operator.batchRecords([...groups, ...groupMemberships]);
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

