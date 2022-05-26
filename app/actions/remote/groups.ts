// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getGroups(query);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchMembershipsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllMembershipsAssociatedToGroup(groupId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchTeamsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllTeamsAssociatedToGroup(groupId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchChannelsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllChannelsAssociatedToGroup(groupId);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchFilteredTeamGroups = async (serverUrl: string, teamId: string, searchTerm: string) => {
    const response = await fetchGroupsForTeam(serverUrl, teamId);

    if (response && 'groups' in response) {
        return response.groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return [];
};

export const fetchFilteredChannelGroups = async (serverUrl: string, channelId: string, searchTerm: string) => {
    const response = await fetchGroupsForChannel(serverUrl, channelId);

    if (response && 'groups' in response) {
        return response.groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return [];
};
