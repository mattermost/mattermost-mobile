// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {of} from 'rxjs';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

//todo: review how the licence, config, etc... are being stored in the database.

export const getSystems = () => {
    const connection = DatabaseManager.getActiveServerDatabase();
    if (!connection) {
        return {
            systems: of([]),
        };
    }

    return {
        systems: connection.collections.
            get(MM_TABLES.SERVER.SYSTEM).
            query(
                Q.where('name', Q.oneOf(['config', 'license', 'root', 'selectServer'])),
            ),
    };
};

