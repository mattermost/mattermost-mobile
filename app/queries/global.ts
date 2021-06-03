// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {Database, Q} from '@nozbe/watermelondb';
import Global from '@typings/database/global';

const {DEFAULT: {GLOBAL}} = MM_TABLES;

export const getDeviceToken = async (defaultDatabase: Database) => {
    const tokens = (await defaultDatabase.collections.get(GLOBAL).query(Q.where('name', 'deviceToken')).fetch()) as Global[];
    return tokens?.[0]?.value ?? '';
};
