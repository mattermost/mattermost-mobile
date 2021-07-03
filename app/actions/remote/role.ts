// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryRoles} from '@queries/servers/role';

export const loadRolesIfNeeded = async (serverUrl: string, updatedRoles: string[]) => {
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

    try {
        const roles = await client.getRolesByNames(newRoles);

        await operator.handleRole({
            roles,
            prepareRecordsOnly: false,
        });
    } catch (error) {
        return {error};
    }

    return null;
};
