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
    const systemRecords = (await database.collections.get(SYSTEM).query(Q.where('id', Q.oneOf(['config', 'license', 'currentUserId']))).fetch()) as System[];
    let config = {};
    let license = {};
    let currentChannelId = '';
    let currentTeamId = '';
    let currentUserId = '';
    systemRecords.forEach((systemRecord) => {
        switch (systemRecord.id) {
            case SYSTEM_IDENTIFIERS.CONFIG:
                config = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID:
                currentChannelId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID:
                currentTeamId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_USER_ID:
                currentUserId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.LICENSE:
                license = systemRecord.value;
                break;
        }
    });

    return {
        currentChannelId,
        currentTeamId,
        currentUserId,
        config,
        license,
    };
};
