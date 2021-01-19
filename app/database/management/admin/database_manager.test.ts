// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DBManager from './database_manager';
jest.mock('./database_manager');

// const appGroup = getIOSAppGroupDetails();
// const defaultDB = DBManager.getDefaultDatabase();

// Deleting db and database direction on iOS
// deleteIOSDatabase({databaseName: 'default'});
// deleteIOSDatabase({databaseName: 'defaultxx'});
// deleteIOSDatabase({shouldRemoveDirectory: true});

// Creates a new server connection
// DBManager.createDatabaseConnection({
//     actionsEnabled: true,
//     dbName: 'zx_t125',
//     dbType: DatabaseType.SERVER,
//     serverUrl: '33xd',
// });

/**
 *const spy = jest.spyOn(video, 'play', 'get'); // we pass 'get'
 const isPlaying = video.play;

 expect(spy).toHaveBeenCalled();
 expect(isPlaying).toBe(true);

 spy.mockRestore();
 */

describe('*** Database Manager ***', () => {
    beforeAll(() => {
        // clear all mocks
        // DBManager.mockClear();
    });

    test('=> Check if DBManager singleton is created', () => {
        const defaultDB = DBManager.getDefaultDatabase();
        const spy = jest.spyOn(DBManager, 'getDefaultDatabase');
        expect(spy).toHaveBeenCalled();
    });
});
