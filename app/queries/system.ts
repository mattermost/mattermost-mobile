// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import System from '@typings/database/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

export const getCurrentUserId = async (serverDatabase: Database) => {
    const currentUserId = await serverDatabase.collections.get(SYSTEM).query(Q.where('name', 'currentUserId')).fetch() as System[];
    return currentUserId?.[0] ?? '';
};

export const getConfigAndLicense = async (database: Database) => {
    const systemRecords = (await database.collections.get(SYSTEM).query(Q.where('name', Q.oneOf(['config', 'license']))).fetch()) as System[];
    let config = {};
    let license = {};
    systemRecords.forEach((systemRecord) => {
        if (systemRecord.name === 'config') {
            config = systemRecord.value;
        }
        if (systemRecord.name === 'license') {
            license = systemRecord.value;
        }
    });

    return {
        config,
        license,
    };
};
