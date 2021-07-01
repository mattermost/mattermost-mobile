// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import System from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

export const queryCurrentChannelId = async (serverDatabase: Database) => {
    const currentChannelId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID) as System;
    return currentChannelId?.value || '';
};

export const getCurrentUserId = async (serverDatabase: Database) => {
    const currentUserId = await serverDatabase.get(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_USER_ID) as System;
    return currentUserId?.value || '';
};

export const getCommonSystemValues = async (database: Database) => {
    const systemRecords = (await database.collections.get(SYSTEM).query(Q.where('name', Q.oneOf(['config', 'license', 'currentUserId']))).fetch()) as System[];
    let config = {};
    let license = {};
    let currentUserId = '';
    systemRecords.forEach((systemRecord) => {
        if (systemRecord.name === 'config') {
            config = systemRecord.value;
        }
        if (systemRecord.name === 'license') {
            license = systemRecord.value;
        }
        if (systemRecord.name === 'currentUserId') {
            currentUserId = systemRecord.value;
        }
    });

    return {
        currentUserId,
        config,
        license,
    };
};
