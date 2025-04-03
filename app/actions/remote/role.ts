// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryRoles} from '@queries/servers/role';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export type RolesRequest = {
    error?: unknown;
    roles?: Role[];
}

export const fetchRolesIfNeeded = async (
    serverUrl: string, updatedRoles: string[],
    fetchOnly = false, force = false, groupLabel?: RequestGroupLabel,
): Promise<RolesRequest> => {
    if (!updatedRoles.length) {
        return {roles: []};
    }

    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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

        const getRolesRequests = [];
        for (let i = 0; i < newRoles.length; i += General.MAX_GET_ROLES_BY_NAMES) {
            const chunk = newRoles.slice(i, i + General.MAX_GET_ROLES_BY_NAMES);
            getRolesRequests.push(client.getRolesByNames(chunk, groupLabel));
        }

        const roles = (await Promise.all(getRolesRequests)).flat();
        if (!fetchOnly) {
            await operator.handleRole({
                roles,
                prepareRecordsOnly: false,
            });
        }

        return {roles};
    } catch (error) {
        logDebug('error on fetchRolesIfNeeded', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchRoles = async (
    serverUrl: string, teamMembership?: TeamMembership[], channelMembership?: ChannelMembership[],
    user?: UserProfile, fetchOnly = false, force = false, groupLabel?: RequestGroupLabel,
) => {
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
        return fetchRolesIfNeeded(serverUrl, Array.from(rolesToFetch), fetchOnly, force, groupLabel);
    }

    return {roles: []};
};
