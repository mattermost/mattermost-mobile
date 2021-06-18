// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import Role from '@typings/database/role';

const {SERVER: {ROLE}} = MM_TABLES;

export const getRoles = async (database: Database) => {
    const roles = await database.collections.get(ROLE).query().fetch() as Role[];
    return roles;
};
