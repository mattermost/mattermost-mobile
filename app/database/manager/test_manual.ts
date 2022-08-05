// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {Platform} from 'react-native';

import {DatabaseType, MM_TABLES} from '@constants/database';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

import DatabaseManager from './index';

import type ServersModel from '@typings/database/models/app/servers';

export default async () => {
    await DatabaseManager.init([]);

    // Test: It should return the iOS App-Group shared directory
    const testAppGroupDirectory = () => {
        if (Platform.OS === 'ios') {
            getIOSAppGroupDetails();
        }
    };

    // Test: It should return the app database
    const testGetAppDatabase = () => {
        return DatabaseManager.appDatabase?.database;
    };

    // Test: It should creates a new server connection
    const testNewServerConnection = async () => {
        await DatabaseManager.createServerDatabase({
            config: {
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://comm4.mattermost.com',
                identifier: 'test-server',
            },
        });
    };

    // Test: It should return the current active server database
    const testGetActiveServerConnection = async () => {
        return DatabaseManager.getActiveServerDatabase();
    };

    // Test: It should set the current active server database to the provided server url.
    const testSetActiveServerConnection = async () => {
        await DatabaseManager.setActiveServerDatabase('https://comm4.mattermost.com');
    };

    // Test: It should return database instance(s) if there are valid server urls in the provided list.
    const testRetrieveAllDatabaseConnections = async () => {
        const database = DatabaseManager.appDatabase?.database;
        const servers = (await database?.collections.get<ServersModel>(MM_TABLES.APP.SERVERS).
            query(Q.where(
                'url',
                Q.oneOf([
                    'https://xunity2.mattermost.com',
                    'https://comm5.mattermost.com',
                    'https://comm4.mattermost.com',
                ]),
            )).fetch());
        return servers;
    };

    // Test: It should delete the associated *.db file for this  server url
    const testDeleteSQLFile = async () => {
        await DatabaseManager.deleteServerDatabase('https://comm4.mattermost.com');
    };

    // Test: It should wipe out the databases folder under the documents direction on Android and in the shared directory for the AppGroup on iOS
    const testFactoryReset = async () => {
        await DatabaseManager.factoryReset(true);
    };

    // NOTE : Comment and test the below functions one at a time.  It starts with creating a default database and ends with a factory reset.

    testAppGroupDirectory();
    testGetAppDatabase();
    await testNewServerConnection();
    testGetActiveServerConnection();
    await testSetActiveServerConnection();
    await testRetrieveAllDatabaseConnections();
    await testDeleteSQLFile();
    await testFactoryReset();
};
