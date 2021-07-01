// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {Database, Q} from '@nozbe/watermelondb';

import type Global from '@typings/database/models/app/global';

const {APP: {GLOBAL}} = MM_TABLES;

export const getDeviceToken = async (appDatabase: Database) => {
    const tokens = (await appDatabase.collections.get(GLOBAL).query(Q.where('id', 'deviceToken')).fetch()) as Global[];
    return tokens?.[0]?.value ?? '';
};
