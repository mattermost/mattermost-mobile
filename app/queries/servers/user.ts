// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

export const queryUserById = ({userId, database}: { userId: string, database: Database}) => {
    return database.collections.get(MM_TABLES.SERVER.USER).query(Q.where('id', userId));
};
