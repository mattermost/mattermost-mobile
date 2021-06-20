// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import DatabaseManager from '@database/manager';
import {getRoles} from '@app/queries/servers/role';

export const loadRolesIfNeeded = async (serverUrl: string, updatedRoles: string[]) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    const existingRoles = ((await getRoles(database)) as unknown) as Role[];

    const roleNames = existingRoles.map((role) => {
        return role.name;
    });

    const newRoles = updatedRoles.filter((newRole) => {
        return !roleNames.includes(newRole);
    });

    try {
        const roles = await Client4.getRolesByNames(newRoles);

        await operator.handleRole({
            roles,
            prepareRecordsOnly: false,
        });
    } catch (error) {
        return {error};
    }

    return null;
};
