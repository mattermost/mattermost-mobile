// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import User from '@typings/database/user';

export const getUserById = async ({userId, database}: { userId: string, database: Database}) => {
    const userRecords = (await database.collections.get(MM_TABLES.SERVER.USER).query(Q.where('id', userId)).fetch()) as User[];
    return userRecords?.[0];
};
