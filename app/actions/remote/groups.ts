// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeGroupChannels, storeGroups, storeGroupTeams} from '@actions/local/group';
import {Client} from '@client/rest';
import NetworkManager from '@managers/network_manager';

import {forceLogoutIfNecessary} from './session';

export const fetchGroupsForChannel = async (serverUrl: string, channelId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToChannel(channelId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForMembership = async (serverUrl: string, userId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToMembership(userId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForTeam = async (serverUrl: string, teamId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToTeam(teamId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string, fetchOnly = false) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        const response = await client.getGroups(query);

        // Save locally
        if (!fetchOnly) {
            await storeGroups(serverUrl, response);
        }

        return response;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchTeamsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllTeamsAssociatedToGroup(groupId);

        // Save locally
        storeGroupTeams(serverUrl, response.groupTeams);

        return response;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchChannelsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        const response = await client.getAllChannelsAssociatedToGroup(groupId);

        // Save locally
        storeGroupChannels(serverUrl, response.groupChannels);

        return response;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

// export const fetchMembershipsForGroup = async (serverUrl: string, groupId: string) => {
//     let client: Client;
//     try {
//         client = NetworkManager.getClient(serverUrl);
//         const response = client.getAllMembershipsAssociatedToGroup(groupId);

//         return response;
//     } catch (error) {
//         forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
//         return {error};
//     }
// };

export const fetchFilteredTeamGroups = async (serverUrl: string, searchTerm: string, teamId: string) => {
    const response = await fetchGroupsForTeam(serverUrl, teamId);

    if (response && 'groups' in response) {
        return response.groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return [];
};

export const fetchFilteredChannelGroups = async (serverUrl: string, searchTerm: string, channelId: string) => {
    const response = await fetchGroupsForChannel(serverUrl, channelId);

    if (response && 'groups' in response) {
        return response.groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return [];
};
