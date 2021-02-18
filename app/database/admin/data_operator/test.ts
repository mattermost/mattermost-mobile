// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '../database_manager';
import {operateAppRecord} from './entity_factory';
import {OperationType} from './index';

jest.mock('../database_manager');

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;

describe('*** Data Operator tests ***', () => {
    it('=> should return an array of type App for operateAppRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.getDefaultDatabase();
        expect(db).toBeTruthy();

        const preparedRecords = await operateAppRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: APP,
            value: {buildNumber: 'build-7', createdAt: 1, id: 'id-18', versionNumber: 'v-1'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('App');
    });

    it('=> should return an array of type Global for operateGlobalRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.getDefaultDatabase();
        expect(db).toBeTruthy();

        const preparedRecords = await operateAppRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: GLOBAL,
            value: {id: 'g-1', name: 'g-n1', value: 'g-v1'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Global');
    });

    it('=> should return an array of type Servers for operateServersRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.getDefaultDatabase();
        expect(db).toBeTruthy();

        const preparedRecords = await operateAppRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: SERVERS,
            value: {
                dbPath: 'mm-server',
                displayName: 's-displayName',
                id: 's-1',
                mentionCount: 1,
                unreadCount: 0,
                url: 'https://community.mattermost.com',
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Servers');
    });
});
