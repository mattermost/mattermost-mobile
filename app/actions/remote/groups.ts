// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '@client/rest';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareGroupChannels, prepareGroupMemberships, prepareGroups, prepareGroupTeams} from '@queries/servers/group';
import {makeGroupMembershipId} from '@utils/group';

export const getGroupsForChannel = async (serverUrl: string, channelId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToChannel(channelId);
    } catch (error) {
        return undefined;
    }
};

export const getGroupsForTeam = async (serverUrl: string, teamId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllGroupsAssociatedToTeam(teamId);
    } catch (error) {
        return undefined;
    }
};

export const getGroupsForAutocomplete = async (serverUrl: string, query: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        const groups = client.getGroups(query);

        // Fetch and save associated groups
        // getAssociationsForGroups(serverUrl, groups);
        return groups;
    } catch (error) {
        return [];
    }
};

export const getMembershipsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllMembershipsAssociatedToGroup(groupId);
    } catch (error) {
        return undefined;
    }
};

export const getTeamsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllTeamsAssociatedToGroup(groupId);
    } catch (error) {
        return undefined;
    }
};

export const getChannelsForGroup = async (serverUrl: string, groupId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        return client.getAllChannelsAssociatedToGroup(groupId);
    } catch (error) {
        return undefined;
    }
};

export const getAssociationsForGroups = async (serverUrl: string, groups: Promise<Group[]>) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const fetchedGroupChannels: GroupChannel[] = [];
    const fetchedGroupTeams: GroupTeam[] = [];
    const fetchedGroupMemberships: GroupMembership[] = [];

    (await groups).forEach(async (g) => {
        const gc = await getChannelsForGroup(serverUrl, g.id);
        if (gc?.groupChannels) {
            fetchedGroupChannels.push(...gc.groupChannels);
        }

        const gt = await getTeamsForGroup(serverUrl, g.id);
        if (gt?.groupTeams) {
            fetchedGroupTeams.push(...gt.groupTeams);
        }

        const gm = await getMembershipsForGroup(serverUrl, g.id);
        if (gm?.groupMemberships) {
            gm.groupMemberships.forEach((m) => {
                fetchedGroupMemberships.push({id: makeGroupMembershipId(g.id, m.id), group_id: g.id, user_id: m.id});
            });
        }
    });

    const models = [];

    const preparedGroups = await prepareGroups(operator, (await groups));
    if (prepareGroups.length) {
        models.push(...preparedGroups);
    }

    const preparedGroupChannels = await prepareGroupChannels(operator, fetchedGroupChannels);
    if (preparedGroupChannels.length) {
        models.push(...preparedGroupChannels);
    }

    const preparedGroupTeams = await prepareGroupTeams(operator, fetchedGroupTeams);
    if (preparedGroupTeams.length) {
        models.push(...preparedGroupTeams);
    }

    const preparedGroupMemberships = await prepareGroupMemberships(operator, fetchedGroupMemberships);
    if (preparedGroupMemberships.length) {
        models.push(...preparedGroupMemberships);
    }

    try {
        operator.batchRecords(models);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('GROUP FETCH ASSOCIATIONS FAIL', e);

        return {data: false};
    }

    return {data: true};
};
