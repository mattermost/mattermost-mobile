// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GLOBAL_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {Database} from '@nozbe/watermelondb';

import type Global from '@typings/database/models/app/global';

const {APP: {GLOBAL}} = MM_TABLES;

export const getDeviceToken = async (appDatabase: Database) => {
    const tokens = await appDatabase.get(GLOBAL).find(GLOBAL_IDENTIFIERS.DEVICE_TOKEN) as Global;
    return tokens?.value || '';
};

export const queryMentionCount = async (appDatabase: Database) => {
    const mentions = await appDatabase.get(GLOBAL).find(GLOBAL_IDENTIFIERS.MENTION_COUNT) as Global;
    return mentions?.value || '';
};
