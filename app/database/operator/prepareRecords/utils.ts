// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {DatabaseType} from '@typings/database/enums';

jest.mock('@database/manager');

export const createConnection = async (databaseName: string) => {
    const serverUrl = 'https://appv2.mattermost.com';
    const database = await DatabaseManager.createDatabaseConnection({
        shouldAddToDefaultDatabase: true,
        configs: {
            actionsEnabled: true,
            dbName: databaseName,
            dbType: DatabaseType.SERVER,
            serverUrl,
        },
    });

    return database;
};
