// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    transformConfigRecord,
    transformCustomEmojiRecord,
    transformRoleRecord,
    transformSystemRecord,
} from '@database/operator/server_data_operator/transformers/general';

import type ServerDataOperator from '..';

describe('*** DataOperator: Base Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> HandleRole: should write to the ROLE table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const roles: Role[] = [
            {
                id: 'custom-role-id-1',
                name: 'custom-role-1',
                permissions: ['custom-permission-1'],
            },
        ];

        await operator.handleRole({
            roles,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformRoleRecord,
            createOrUpdateRawValues: roles,
            tableName: 'Role',
            prepareRecordsOnly: false,
        }, 'handleRole');
    });

    it('=> HandleCustomEmojis: should write to the CUSTOM_EMOJI table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const emojis: CustomEmoji[] = [
            {
                id: 'i',
                create_at: 1580913641769,
                update_at: 1580913641769,
                delete_at: 0,
                creator_id: '4cprpki7ri81mbx8efixcsb8jo',
                name: 'boomI',
            },
        ];

        await operator.handleCustomEmojis({
            emojis,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'name',
            createOrUpdateRawValues: emojis,
            tableName: 'CustomEmoji',
            prepareRecordsOnly: false,
            transformer: transformCustomEmojiRecord,
        }, 'handleCustomEmojis');
    });

    it('=> HandleSystem: should write to the SYSTEM table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const systems = [{id: 'system-1', value: 'system-1'}];

        await operator.handleSystem({
            systems,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformSystemRecord,
            createOrUpdateRawValues: systems,
            tableName: 'System',
            prepareRecordsOnly: false,
        }, 'handleSystem');
    });

    it('=> HandleConfig: should write to the CONFIG table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const configs = [{id: 'config-1', value: 'config-1'}];
        const configsToDelete = [{id: 'toDelete', value: 'toDelete'}];

        await operator.handleConfigs({
            configs,
            configsToDelete,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformConfigRecord,
            createOrUpdateRawValues: configs,
            tableName: 'Config',
            prepareRecordsOnly: false,
            deleteRawValues: configsToDelete,
        }, 'handleConfigs');
    });

    it('=> No table name: should not call execute if tableName is invalid', async () => {
        expect.assertions(3);

        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        await expect(
            operator?.handleRecords({
                fieldName: 'invalidField',
                tableName: 'INVALID_TABLE_NAME',
                transformer: transformSystemRecord,
                createOrUpdateRawValues: [{id: 'tos-1', value: '1'}],
                prepareRecordsOnly: false,
            }, 'test'),
        ).rejects.toThrow(Error);
    });
});
