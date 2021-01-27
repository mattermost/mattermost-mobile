// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import {getIOSAppGroupDetails} from '@utils/mattermost_managed';
// import {Platform} from 'react-native';
// import DBManager from './index';

// jest.mock('./database_manager');

// describe('*** Database Manager ***', () => {
//     beforeAll(() => {
//         // clear all mocks
//         // DBManager.mockClear();
//     });
//
//     test('=> Check if DBManager singleton is created', () => {
//         const defaultDB = DBManager.getDefaultDatabase();
//         const spy = jest.spyOn(DBManager, 'getDefaultDatabase');
//         expect(spy).toHaveBeenCalled();
//     });
// });

export const runDBManagerTest = async () => {
    // if (Platform.OS === 'ios') {
    //     const appGroup = getIOSAppGroupDetails();
    //     console.log(appGroup);
    // }

    // const defaultDB = DBManager.getDefaultDatabase();

    // Deleting db and database directory on iOS
    // deleteIOSDatabase({databaseName: 'default'});
    // deleteIOSDatabase({shouldRemoveDirectory: true});

    // Deleting db and database directory on Android
    // await DBManager.deleteDBFileOnAndroid({databaseName: 'default'});
    // await DBManager.factoryResetOnAndroid({shouldRemoveDirectory: true});

    // const databaseConnection = {
    //     actionsEnabled: true,
    //     dbName: 'community mattermost',
    //     dbType: DatabaseType.SERVER,
    //     serverUrl: 'https://comm4.mattermost.com',
    // };

    // Creates a new server connection
    // DBManager.createDatabaseConnection({
    //     databaseConnection, shouldAddToDefaultDB: true,
    // }).then();

    // DBManager.removeServerFromDefaultDB({serverUrl: 'https://community.mattermost.com'});

    // const a = await DBManager.retrieveDatabaseInstances([
    //     'https://xunity2.mattermost.com',
    //     'https://comm4.mattermost.com',
    //     'https://comm2.mattermost.com',
    // ]);

    // console.log({a});
};
