// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '@client/rest';
import NetworkManager from '@managers/network_manager';

export const fetchGroupsForChannel = async (serverUrl: string, channelId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToChannel(channelId);
    } catch (error) {
        return {error};
    }
};

export const fetchGroupsForTeam = async (serverUrl: string, teamId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToTeam(teamId);
    } catch (error) {
        return {error};
    }
};

export const fetchGroupsForAutocomplete = async (serverUrl: string, query: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getGroups(query);
    } catch (error) {
        return {error};
    }
};
