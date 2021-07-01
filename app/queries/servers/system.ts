// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import System from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

export const getCurrentUserId = async (serverDatabase: Database) => {
    const currentUserId = await serverDatabase.collections.get(SYSTEM).query(Q.where('id', 'currentUserId')).fetch() as System[];
    return currentUserId?.[0];
};

export const getCommonSystemValues = async (database: Database) => {
    const systemRecords = (await database.collections.get(SYSTEM).query(Q.where('id', Q.oneOf(['config', 'license', 'currentUserId']))).fetch()) as System[];
    let config = {};
    let license = {};
    let currentUserId = '';
    systemRecords.forEach((systemRecord) => {
        if (systemRecord.id === 'config') {
            config = systemRecord.value;
        }
        if (systemRecord.id === 'license') {
            license = systemRecord.value;
        }
        if (systemRecord.id === 'currentUserId') {
            currentUserId = systemRecord.value;
        }
    });

    return {
        currentUserId,
        config,
        license,
    };
};
