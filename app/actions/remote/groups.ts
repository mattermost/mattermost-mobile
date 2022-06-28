// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeGroups} from '@actions/local/group';
import {Client} from '@client/rest';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareGroups} from '@queries/servers/group';

import {forceLogoutIfNecessary} from './session';

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string, fetchOnly = false) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client: Client = NetworkManager.getClient(serverUrl);
        const response = await client.getGroups(query);

        // Save locally
        if (!fetchOnly) {
            return storeGroups(serverUrl, response);
        }

        return prepareGroups(operator, response);
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
        if (!fetchOnly) {
            return storeGroups(serverUrl, groups);
        }

        return prepareGroups(operator, groups);
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

        if (!fetchOnly) {
            return storeGroups(serverUrl, response.groups);
        }

        return prepareGroups(operator, response.groups);
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

        if (!fetchOnly) {
            return storeGroups(serverUrl, response.groups);
        }

        return prepareGroups(operator, response.groups);
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

