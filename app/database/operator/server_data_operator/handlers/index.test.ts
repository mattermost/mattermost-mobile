// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperatorException from '@database/exceptions/data_operator_exception';
import DatabaseManager from '@database/manager';
import {
    isRecordCustomEmojiEqualToRaw,
    isRecordRoleEqualToRaw,
    isRecordSystemEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformCustomEmojiRecord,
    transformRoleRecord,
    transformSystemRecord,
} from '@database/operator/server_data_operator/transformers/general';

import type ServerDataOperator from '..';
import type {Model} from '@nozbe/watermelondb';

describe('*** DataOperator: Base Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
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
            findMatchingRecordBy: isRecordRoleEqualToRaw,
            createOrUpdateRawValues: roles,
            tableName: 'Role',
            prepareRecordsOnly: false,
        });
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
            findMatchingRecordBy: isRecordCustomEmojiEqualToRaw,
            transformer: transformCustomEmojiRecord,
        });
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
            findMatchingRecordBy: isRecordSystemEqualToRaw,
            fieldName: 'id',
            transformer: transformSystemRecord,
            createOrUpdateRawValues: systems,
            tableName: 'System',
            prepareRecordsOnly: false,
        });
    });

    it('=> No table name: should not call execute if tableName is invalid', async () => {
        expect.assertions(3);

        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const findMatchingRecordBy = (existing: Model, newRecord: any) => {
            return existing === newRecord;
        };

        const transformer = async (model: Model) => model;

        await expect(
            operator?.handleRecords({
                fieldName: 'invalidField',
                tableName: 'INVALID_TABLE_NAME',
                findMatchingRecordBy,
                transformer,
                createOrUpdateRawValues: [{id: 'tos-1', value: '1'}],
                prepareRecordsOnly: false,
            }),
        ).rejects.toThrow(DataOperatorException);
    });
});
