// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {of} from 'rxjs';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

//todo: review how the licence, config, etc... are being stored in the database.

const {SYSTEM} = MM_TABLES.SERVER;

export const getSystems = () => {
    const database = DatabaseManager.getActiveServerDatabase();
    if (!database) {
        return {
            systems: of([]),
        };
    }

    return {
        systems: database.collections.
            get(SYSTEM).
            query(
                Q.where('name', Q.oneOf(['config', 'license', 'root', 'selectServer'])),
            ),
    };
};

