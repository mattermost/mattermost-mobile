// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import Operator from '@database/operator';
import {getRoles} from '@queries/role';
import {IsolatedEntities} from '@typings/database/enums';
import {getActiveServerDatabase} from '@utils/database';

export const loadRolesIfNeeded = async (updatedRoles: string[]) => {
    const {activeServerDatabase: database, error: e} = await getActiveServerDatabase();
    if (!database) {
        return {error: e};
    }

    const existingRoles = ((await getRoles(database)) as unknown) as Role[];

    const roleNames = existingRoles.map((role) => {
        return role.name;
    });

    const newRoles = updatedRoles.filter((newRole) => {
        return !roleNames.includes(newRole);
    });

    try {
        const operator = new Operator(database);
        const data = await Client4.getRolesByNames(newRoles);
        await operator.handleIsolatedEntity({
            tableName: IsolatedEntities.ROLE,
            values: data,
            prepareRecordsOnly: false,
        });
    } catch (error) {
        return {error};
    }

    return null;
};
