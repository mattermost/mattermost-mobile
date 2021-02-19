// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import App from '@typings/database/app';

import DatabaseManager, {DatabaseType} from '../database_manager';
import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateGlobalRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
} from './operators';
import DataOperator, {OperationType} from './index';

jest.mock('../database_manager');

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;
const {CUSTOM_EMOJI, ROLE, SYSTEM, TERMS_OF_SERVICE} = MM_TABLES.SERVER;

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

        const preparedRecords = await operateGlobalRecord({
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

        const preparedRecords = await operateServersRecord({
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

    it('=> should return an array of type CustomEmoji for operateCustomEmojiRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv2.mattermost.com',
            },
        });
        expect(db).toBeTruthy();

        const preparedRecords = await operateCustomEmojiRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: CUSTOM_EMOJI,
            value: {id: 'emo-1', name: 'emoji'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('CustomEmoji');
    });

    it('=> should return an array of type Role for operateRoleRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv2.mattermost.com',
            },
        });
        expect(db).toBeTruthy();

        const preparedRecords = await operateRoleRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: ROLE,
            value: {id: 'role-1', name: 'role-name-1', permissions: []},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Role');
    });

    it('=> should return an array of type System for operateSystemRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv2.mattermost.com',
            },
        });
        expect(db).toBeTruthy();

        const preparedRecords = await operateSystemRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: SYSTEM,
            value: {id: 'system-1', name: 'system-name-1', value: 'system'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('System');
    });

    it('=> should return an array of type TermsOfService for operateTermsOfServiceRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv2.mattermost.com',
            },
        });
        expect(db).toBeTruthy();

        const preparedRecords = await operateSystemRecord({
            db: db!,
            optType: OperationType.CREATE,
            tableName: TERMS_OF_SERVICE,
            value: {id: 'system-1', acceptedAt: 1},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('TermsOfService');
    });

    it('=> should create a record in the App table in the default database', async () => {
        expect.assertions(2);

        // Creates a record in the App table
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.CREATE,
            tableName: APP,
            values: {buildNumber: 'build-1', createdAt: 1, id: 'id-1', versionNumber: 'version-1'},
        });

        // Do a query and find out if the value has been registered in the App table of the default database
        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', 'id-1')).fetch() as App[];

        // We should expect to have a record returned as dictated by our query
        expect(records.length).toBe(1);
    });

    it('=> should create several record in the App table in the default database', async () => {
        expect.assertions(2);

        // Creates a record in the App table
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.CREATE,
            tableName: APP,
            values: [
                {buildNumber: 'build-10', createdAt: 1, id: 'id-10', versionNumber: 'version-10'},
                {buildNumber: 'build-11', createdAt: 1, id: 'id-11', versionNumber: 'version-11'},
                {buildNumber: 'build-12', createdAt: 1, id: 'id-12', versionNumber: 'version-12'},
                {buildNumber: 'build-13', createdAt: 1, id: 'id-13', versionNumber: 'version-13'},
            ],
        });

        // Do a query and find out if the value has been registered in the App table of the default database
        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', Q.oneOf(['id-10', 'id-11', 'id-12', 'id-13']))).fetch() as App[];

        // We should expect to have 4 records created
        expect(records.length).toBe(4);
    });

    it('=> should update a record in the App table in the default database', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // Update record having id 'id-1'
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.UPDATE,
            tableName: APP,
            values: {buildNumber: 'build-13-13', createdAt: 1, id: 'id-1', versionNumber: 'version-1'},
        });

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', 'id-1')).fetch() as App[];
        expect(records.length).toBeGreaterThan(0);

        // Verify if the buildNumber for this record has been updated
        expect(records[0].buildNumber).toMatch('build-13-13');
    });

    it('=> should update several records in the App table in the default database', async () => {
        expect.assertions(4);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // Update records having id 'id-10' and 'id-11'
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.UPDATE,
            tableName: APP,
            values: [
                {buildNumber: 'build-10x', createdAt: 1, id: 'id-10', versionNumber: 'version-10'},
                {buildNumber: 'build-11y', createdAt: 1, id: 'id-11', versionNumber: 'version-11'},
            ],
        });

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', Q.oneOf(['id-10', 'id-11']))).fetch() as App[];
        expect(records.length).toBe(2);

        // Verify if the buildNumber for those two record has been updated
        expect(records[0].buildNumber).toMatch('build-10x');
        expect(records[1].buildNumber).toMatch('build-11y');
    });
});
