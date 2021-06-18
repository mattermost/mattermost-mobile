// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {DatabaseType} from '@typings/database/enums';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

import DatabaseManager from './index';

export default async () => {
    const databaseClient = new DatabaseManager();

    // Test: It should return the iOS App-Group shared directory
    const testAppGroupDirectory = () => {
        if (Platform.OS === 'ios') {
            getIOSAppGroupDetails();
        }
    };

    // Test: It should return an instance of the default database
    const testGetDefaultDatabase = () => {
        databaseClient.getDefaultDatabase();
    };

    // Test: It should creates a new server connection
    const testNewServerConnection = async () => {
        await databaseClient.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://comm4.mattermost.com',
            },
        });
    };

    // Test: It should return the current active server database
    const testGetActiveServerConnection = () => {
        // const activeServer = DatabaseManager.getActiveServerDatabase();
    };

    // Test: It should set the current active server database to the provided server url.
    const testSetActiveServerConnection = async () => {
        await databaseClient.setActiveServerDatabase('https://comm4.mattermost.com');
    };

    // Test: It should return database instance(s) if there are valid server urls in the provided list.
    const testRetrieveAllDatabaseConnections = async () => {
        await databaseClient.retrieveDatabaseInstances([
            'https://xunity2.mattermost.com',
            'https://comm5.mattermost.com',
            'https://comm4.mattermost.com',
        ]);
    };

    // Test: It should delete the associated *.db file for this  server url
    const testDeleteSQLFile = async () => {
        await databaseClient.deleteDatabase('https://comm4.mattermost.com');
    };

    // Test: It should wipe out the databases folder under the documents direction on Android and in the shared directory for the AppGroup on iOS
    const testFactoryReset = async () => {
        await databaseClient.factoryReset(true);
    };

    // NOTE : Comment and test the below functions one at a time.  It starts with creating a default database and ends with a factory reset.

    testAppGroupDirectory();
    testGetDefaultDatabase();
    await testNewServerConnection();
    testGetActiveServerConnection();
    await testSetActiveServerConnection();
    await testRetrieveAllDatabaseConnections();
    await testDeleteSQLFile();
    await testFactoryReset();
};
