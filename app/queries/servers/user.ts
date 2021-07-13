// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type User from '@typings/database/models/servers/user';

import {queryCurrentUserId} from './system';

export const queryUserById = async ({userId, database}: { userId: string; database: Database}) => {
    try {
        const userRecord = (await database.collections.get(MM_TABLES.SERVER.USER).find(userId)) as User;
        return userRecord;
    } catch {
        return undefined;
    }
};

export const queryCurrentUser = async (database: Database) => {
    const currentUserId = await queryCurrentUserId(database);
    if (currentUserId) {
        return queryUserById({userId: currentUserId, database});
    }

    return undefined;
};
