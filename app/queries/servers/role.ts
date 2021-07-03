// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import Role from '@typings/database/models/servers/role';

const {SERVER: {ROLE}} = MM_TABLES;

export const queryRoles = async (database: Database) => {
    const roles = await database.collections.get(ROLE).query().fetch() as Role[];
    return roles;
};
