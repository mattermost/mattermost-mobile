// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryRoles} from '@queries/servers/role';

import {forceLogoutIfNecessary} from './session';

export type RolesRequest = {
    error?: unknown;
    roles?: Role[];
}

export const fetchRolesIfNeeded = async (serverUrl: string, updatedRoles: string[], fetchOnly = false, force = false): Promise<RolesRequest> => {
    if (!updatedRoles.length) {
        return {roles: []};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let database;
    let operator;
    try {
        const result = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = result.database;
        operator = result.operator;
    } catch (e) {
        return {error: `${serverUrl} database not found`};
    }

    let newRoles;
    if (force) {
        newRoles = updatedRoles;
    } else {
        const existingRoles = await queryRoles(database).fetch();

        const roleNames = new Set(existingRoles.map((role) => {
            return role.name;
        }));

        newRoles = updatedRoles.filter((newRole) => {
            return !roleNames.has(newRole);
        });
    }

    if (!newRoles.length) {
        return {roles: []};
    }

    try {
        const roles = await client.getRolesByNames(newRoles);
        if (!fetchOnly) {
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

export const fetchRoles = async (serverUrl: string, teamMembership?: TeamMembership[], channelMembership?: ChannelMembership[], user?: UserProfile, fetchOnly = false, force = false) => {
    const rolesToFetch = new Set<string>(user?.roles.split(' ') || []);

    if (teamMembership?.length) {
        const teamRoles: string[] = [];

        teamMembership?.forEach((tm) => {
            teamRoles.push(...tm.roles.split(' '));
        });

        teamRoles.forEach(rolesToFetch.add, rolesToFetch);
    }

    if (channelMembership?.length) {
        for (let i = 0; i < channelMembership!.length; i++) {
            const member = channelMembership[i];
            member.roles.split(' ').forEach(rolesToFetch.add, rolesToFetch);
        }
    }

    rolesToFetch.delete('');
    if (rolesToFetch.size > 0) {
        return fetchRolesIfNeeded(serverUrl, Array.from(rolesToFetch), fetchOnly, force);
    }

    return {roles: []};
};
