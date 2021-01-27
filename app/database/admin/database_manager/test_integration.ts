// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

// import {Platform} from 'react-native';
// import DBManager, {DatabaseType} from './index';

export const runDBManagerTest = async () => {
    // Test: It should return the iOS App-Group shared directory
    // if (Platform.OS === 'ios') {
    //     const appGroup = getIOSAppGroupDetails();
    // }

    // Test: It should return an instance of the default database
    // const defaultDB = DBManager.getDefaultDatabase();

    // Test: It should creates a new server connection
    // await DBManager.createDatabaseConnection({
    //     shouldAddToDefaultDatabase: true,
    //     databaseConnection: {
    //         actionsEnabled: true,
    //         dbName: 'community mattermost',
    //         dbType: DatabaseType.SERVER,
    //         serverUrl: 'https://comm4.mattermost.com',
    //     },
    // });

    // Test: It should set the current active server database to the provided server url.
    // await DBManager.setActiveServerDatabase({
    //     displayName: 'lala',
    //     serverUrl: 'https://comm4.mattermost.com',
    // });

    // Test: It should return the current active server database
    // const activeServer = DBManager.getActiveServerDatabase();

    // Test: It should return database instance(s) if there are valid server urls in the provided list.
    // const a = await DBManager.retrieveDatabaseInstances([
    //     'https://xunity2.mattermost.com',
    //     'https://comm5.mattermost.com',
    //     'https://comm4.mattermost.com',
    // ]);

    // Test: It should delete the associated *.db file for this  server url
    // await DBManager.deleteDatabase('https://comm4.mattermost.com');

    // Test: It should wipe out the databases folder under the documents direction on Android and in the shared directory for the AppGroup on iOS
    // await DBManager.factoryReset(true);
};
