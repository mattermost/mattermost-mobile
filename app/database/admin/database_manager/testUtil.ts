// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {Platform} from 'react-native';
import DBManager, {DatabaseType} from './index';

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

export const runDBManagerTest = () => {
    // if (Platform.OS === 'ios') {
    //     const appGroup = getIOSAppGroupDetails();
    //     console.log(appGroup);
    // }
    //
    // const defaultDB = DBManager.getDefaultDatabase();

    // Deleting db and database direction on iOS
    // deleteIOSDatabase({databaseName: 'default'});
    // deleteIOSDatabase({databaseName: 'defaultxx'});
    // deleteIOSDatabase({shouldRemoveDirectory: true});

    // Creates a new server connection
    // DBManager.createDatabaseConnection({
    //     actionsEnabled: true,
    //     dbName: 'community mattermost',
    //     dbType: DatabaseType.SERVER,
    //     serverUrl: 'https://community.mattermost.com',
    // });

    // DBManager.removeServerFromDefaultDB({serverUrl: 'https://community.mattermost.com'});
};
