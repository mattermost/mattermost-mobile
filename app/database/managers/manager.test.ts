// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {defaultSchema} from '../default/schema';
import DBManager from './database_manager';
import {createSqliteAdaptor} from './utils';
import {SQLiteAdapterOptions} from '@nozbe/watermelondb/adapters/sqlite';

// describe('Testing schema manager', () => {
//     test('it should return an adaptor options', () => {
//         const expectedOutput = {
//             schema: defaultSchema,
//             dbName: 'default_db',
//             migrationEvents: {
//                 onStarted: () => {
//                     console.log(' migration started');
//                 },
//                 onFailure: () => {
//                     console.log(' migration failed');
//                 },
//                 onSuccess: () => {
//                     console.log(' migration succeeded');
//                 },
//             },
//         };
//         const result: SQLiteAdapterOptions = createSqliteAdaptor({
//             schema: defaultSchema,
//             dbPath: 'default_db',
//             migrationEvents: {
//                 onStarted: () => {
//                     console.log(' migration started');
//                 },
//                 onFailure: () => {
//                     console.log(' migration failed');
//                 },
//                 onSuccess: () => {
//                     console.log(' migration succeeded');
//                 },
//             }});
//
//         // NOTE: stringifying because of https://github.com/facebook/jest/issues/8475
//         expect(JSON.stringify(result)).toBe(JSON.stringify(expectedOutput));
//     });
// });

describe('Database Manager actions ', () => {
    const defaultDB = DBManager.getDefaultDatabase();

    const allServers = DBManager.getAllServerDatabases([]);

    console.log(defaultDB);
    console.log(allServers);
});
