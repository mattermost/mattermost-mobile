// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeGroups} from '@actions/local/group';
import {prepareGroups} from '@app/queries/servers/group';
import {Client} from '@client/rest';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {forceLogoutIfNecessary} from './session';

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string, fetchOnly = false) => {
    try {
        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getGroups(query);

        // Save locally
        if (!fetchOnly) {
            return await storeGroups(serverUrl, response);
        }

        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            throw new Error(`${serverUrl} operator not found`);
        }

        return await prepareGroups(operator, response);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForChannel = async (serverUrl: string, channelId: string, fetchOnly = false) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToChannel(channelId);

        if (!fetchOnly) {
            return await storeGroups(serverUrl, response.groups);
        }

        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            throw new Error(`${serverUrl} operator not found`);
        }

        return await prepareGroups(operator, response.groups);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForTeam = async (serverUrl: string, teamId: string, fetchOnly = false) => {
    try {
        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllGroupsAssociatedToTeam(teamId);

        if (!fetchOnly) {
            return await storeGroups(serverUrl, response.groups);
        }

        // return await storeGroups(serverUrl, response.groups, true);
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (!operator) {
            throw new Error(`${serverUrl} operator not found`);
        }

        return await prepareGroups(operator, response.groups);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
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

