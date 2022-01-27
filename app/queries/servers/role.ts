// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {Database as DatabaseConstants} from '@constants';

import type RoleModel from '@typings/database/models/servers/role';

const {ROLE} = DatabaseConstants.MM_TABLES.SERVER;

export const queryRoles = async (database: Database) => {
    const roles = await database.collections.get(ROLE).query().fetch() as RoleModel[];
    return roles;
};

export const queryRoleById = async (database: Database, roleId: string): Promise<RoleModel|undefined> => {
    try {
        const role = (await database.get(ROLE).find(roleId)) as RoleModel;
        return role;
    } catch {
        return undefined;
    }
};
