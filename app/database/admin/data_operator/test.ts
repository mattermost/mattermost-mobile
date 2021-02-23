// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {Q} from '@nozbe/watermelondb';
import App from '@typings/database/app';

import DatabaseManager, {DatabaseType} from '../database_manager';
import DataOperator, {IsolatedEntities, OperationType} from './index';
import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateGlobalRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
} from './operators';

jest.mock('../database_manager');

const {APP} = MM_TABLES.DEFAULT;

describe('*** Data Operator tests ***', () => {
    it('=> should return an array of type App for operateAppRecord', async () => {
        expect.assertions(3);

        const db = await DatabaseManager.getDefaultDatabase();
        expect(db).toBeTruthy();

        const preparedRecords = await operateAppRecord({
            db: db!,
            optType: OperationType.CREATE,
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

        const preparedRecords = await operateTermsOfServiceRecord({
            db: db!,
            optType: OperationType.CREATE,
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
            tableName: IsolatedEntities.APP,
            values: {buildNumber: 'build-1', createdAt: 1, id: 'id-1', versionNumber: 'version-1'},
        });

        // Do a query and find out if the value has been registered in the App table of the default database
        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', 'id-1')).fetch() as App[];

        // We should expect to have a record returned as dictated by our query
        expect(records.length).toBe(1);
    });

    it('=> should create several records in the App table in the default database', async () => {
        expect.assertions(2);

        // Creates a record in the App table
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.APP,
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
            tableName: IsolatedEntities.APP,
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
            tableName: IsolatedEntities.APP,
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

    it('=> [EDGE CASE] should UPDATE instead of CREATE record for existing id', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // id-10 and id-11 exist but yet the optType is CREATE.  The operator should then prepareUpdate the records instead of prepareCreate
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.APP,
            values: [
                {buildNumber: 'build-10x', createdAt: 1, id: 'id-10', versionNumber: 'version-10'},
                {buildNumber: 'build-11x', createdAt: 1, id: 'id-11', versionNumber: 'version-11'},
            ],
        });

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', Q.oneOf(['id-10', 'id-11']))).fetch() as App[];

        // Verify if the buildNumber for those two record has been updated
        expect(records[0].buildNumber).toMatch('build-10x');
        expect(records[1].buildNumber).toMatch('build-11x');
    });

    it('=> [EDGE CASE] should CREATE instead of UPDATE record for non-existing id', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // id-15 and id-16 do not exist but yet the optType is UPDATE.  The operator should then prepareCreate the records instead of prepareUpdate
        await DataOperator.handleIsolatedEntityData({
            optType: OperationType.UPDATE,
            tableName: IsolatedEntities.APP,
            values: [
                {buildNumber: 'build-10x', createdAt: 1, id: 'id-15', versionNumber: 'version-10'},
                {buildNumber: 'build-11x', createdAt: 1, id: 'id-16', versionNumber: 'version-11'},
            ],
        });

        const records = await defaultDB!.collections.get(APP).query(Q.where('id', Q.oneOf(['id-15', 'id-16']))).fetch() as App[];

        // Verify if the buildNumber for those two record has been created
        expect(records[0].buildNumber).toMatch('build-10x');
        expect(records[1].buildNumber).toMatch('build-11x');
    });

    it('=> should use operateAppRecord for APP entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.APP,
            values: [
                {buildNumber: 'build-10x', createdAt: 1, id: 'id-21', versionNumber: 'version-10'},
                {buildNumber: 'build-11y', createdAt: 1, id: 'id-22', versionNumber: 'version-11'},
            ],
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateAppRecord});
    });

    it('=> should use operateGlobalRecord for GLOBAL entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.GLOBAL,
            values: {id: 'global-1-id', name: 'global-1-name', value: 'global-1-value'},
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateGlobalRecord});
    });

    it('=> should use operateServersRecord for SERVERS entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.SERVERS,
            values: {
                dbPath: 'server.db',
                displayName: 'community',
                id: 'server-id-1',
                mentionCount: 0,
                unreadCount: 0,
                url: 'https://community.mattermost.com',
            },
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateServersRecord});
    });

    it('=> should use operateCustomEmojiRecord for CUSTOM_EMOJI entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.CUSTOM_EMOJI,
            values: {
                id: 'custom-emoji-id-1',
                name: 'custom-emoji-1',
            },
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateCustomEmojiRecord});
    });

    it('=> should use operateRoleRecord for ROLE entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.ROLE,
            values: {
                id: 'custom-emoji-id-1',
                name: 'custom-emoji-1',
                permissions: ['custom-emoji-1'],
            },
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateRoleRecord});
    });

    it('=> should use operateSystemRecord for SYSTEM entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.SYSTEM,
            values: {id: 'system-id-1', name: 'system-1', value: 'system-1'},
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateSystemRecord});
    });

    it('=> should use operateTermsOfServiceRecord for TERMS_OF_SERVICE entity in handleBaseData', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.TERMS_OF_SERVICE,
            values: {id: 'tos-1', acceptedAt: 1},
        };

        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({...data, recordOperator: operateTermsOfServiceRecord});
    });

    it('=> should not call handleBaseData if tableName is invalid', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBaseData');

        const data = {
            optType: OperationType.CREATE,
            tableName: 'INVALID_TABLE_NAME',
            values: {id: 'tos-1', acceptedAt: 1},
        };

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await DataOperator.handleIsolatedEntityData(data);

        expect(spyOnHandleBase).toHaveBeenCalledTimes(0);
    });
});
