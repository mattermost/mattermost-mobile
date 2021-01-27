// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

// import {Platform} from 'react-native';
// import DBManager, {DatabaseType} from './index';

export const runDBManagerTest = async () => {
    // if (Platform.OS === 'ios') {
    //     const appGroup = getIOSAppGroupDetails();
    //     console.log(appGroup);
    // }

    // const defaultDB = DBManager.getDefaultDatabase();

    // Creates a new server connection
    // DBManager.createDatabaseConnection({
    //     shouldAddToDefaultDatabase: true,
    //     databaseConnection: {
    //         actionsEnabled: true,
    //         dbName: 'community mattermost',
    //         dbType: DatabaseType.SERVER,
    //         serverUrl: 'https://comm4.mattermost.com',
    //     },
    // }).then();

    // await DBManager.setActiveServerDatabase({
    //     displayName: 'lala',
    //     serverUrl: 'https://comm4.mattermost.com',
    // });
    //
    // //
    // const activeServer = DBManager.getActiveServerDatabase();
    //
    // console.log(activeServer);

    // Deleting db and database directory on iOS
    // deleteIOSDatabase({databaseName: 'default'});
    // deleteIOSDatabase({shouldRemoveDirectory: true});

    // Deleting db and database directory on Android
    // await DBManager.deleteDatabase('https://comm4.mattermost.com');

    // await DBManager.factoryResetOnAndroid({shouldRemoveDirectory: true});

    // const a = await DBManager.retrieveDatabaseInstances([
    //     'https://xunity2.mattermost.com',
    //     'https://comm4.mattermost.com',
    //     'https://comm2.mattermost.com',
    // ]);

    // console.log({a});
};
