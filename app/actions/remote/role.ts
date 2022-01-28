// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryRoles} from '@queries/servers/role';

import {forceLogoutIfNecessary} from './session';

export type RolesRequest = {
    error?: unknown;
    roles?: Role[];
}

export const fetchRolesIfNeeded = async (serverUrl: string, updatedRoles: string[], fetchOnly = false): Promise<RolesRequest> => {
    if (!updatedRoles.length) {
        return {roles: []};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const database = DatabaseManager.serverDatabases[serverUrl].database;
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    const existingRoles = await queryRoles(database);

    const roleNames = existingRoles.map((role) => {
        return role.name;
    });

    const newRoles = updatedRoles.filter((newRole) => {
        return !roleNames.includes(newRole);
    });

    if (!newRoles.length) {
        return {roles: []};
    }

    try {
        const roles = await client.getRolesByNames(newRoles);

        if (!fetchOnly && roles.length) {
            await operator.handleRole({
                roles,
                prepareRecordsOnly: false,
            });
        }

        return {roles};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchRoles = async (serverUrl: string, teamMembership?: TeamMembership[], channelMembership?: ChannelMembership[], user?: UserProfile) => {
    const rolesToFetch = new Set<string>(user?.roles.split(' ') || []);

    if (teamMembership?.length) {
        const teamRoles: string[] = [];
        const teamMembers: string[] = [];

        teamMembership?.forEach((tm) => {
            teamRoles.push(...tm.roles.split(' '));
            teamMembers.push(tm.team_id);
        });

        teamRoles.forEach(rolesToFetch.add, rolesToFetch);
    }

    if (channelMembership?.length) {
        for (let i = 0; i < channelMembership!.length; i++) {
            const member = channelMembership[i];
            member.roles.split(' ').forEach(rolesToFetch.add, rolesToFetch);
        }
    }

    if (rolesToFetch.size > 0) {
        fetchRolesIfNeeded(serverUrl, Array.from(rolesToFetch));
    }
};
