// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {Database as DatabaseConstants} from '@constants';

import type RoleModel from '@typings/database/models/servers/role';

const {ROLE} = DatabaseConstants.MM_TABLES.SERVER;

export const queryRoles = (database: Database) => {
    return database.collections.get<RoleModel>(ROLE).query();
};

export const getRoleById = async (database: Database, roleId: string): Promise<RoleModel|undefined> => {
    try {
        const role = (await database.get<RoleModel>(ROLE).find(roleId));
        return role;
    } catch {
        return undefined;
    }
};

export const queryRolesByNames = (database: Database, names: string[]) => {
    return database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(names)));
};
