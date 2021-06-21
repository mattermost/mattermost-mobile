// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {DatabaseType} from '@typings/database/enums';

export const createTestConnection = async ({databaseName = 'db_name', setActive = false}) => {
    const serverUrl = 'https://appv2.mattermost.com';
    await DatabaseManager.init([]);
    const server = await DatabaseManager.createServerDatabase({
        config: {
            dbName: databaseName,
            dbType: DatabaseType.SERVER,
            serverUrl,
        },
    });

    if (setActive && server) {
        await DatabaseManager.setActiveServerDatabase(serverUrl);
    }

    return server?.database;
};
