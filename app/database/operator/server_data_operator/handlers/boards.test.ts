// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
    transformViewRecord,
} from '@database/operator/server_data_operator/transformers/boards';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PROPERTY_FIELD, PROPERTY_VALUE, VIEW} = MM_TABLES.SERVER;

describe('*** Operator: Boards Handlers tests ***', () => {
    let operator: ServerDataOperator;
    const serverUrl = `boardsHandler.test.${Date.now()}.com`;

    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('=> handleViews', () => {
        it('should delegate to handleRecords with the view transformer', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const views: View[] = [{
                id: 'view1',
                channel_id: 'channel1',
                type: 'kanban',
                creator_id: 'user1',
                title: 'Roadmap',
                sort_order: 0,
                props: {},
                create_at: 1,
                update_at: 1,
                delete_at: 0,
            }];

            await operator.handleViews({views, prepareRecordsOnly: false});

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: views,
                tableName: VIEW,
                prepareRecordsOnly: false,
                transformer: transformViewRecord,
            }, 'handleViews');
        });

        it('should return [] without calling handleRecords when views is empty', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handleViews({views: [], prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should return [] without calling handleRecords when views is undefined', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handleViews({prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('=> handlePropertyFields', () => {
        it('should delegate to handleRecords with the property field transformer', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const fields: PropertyField[] = [{
                id: 'field1',
                group_id: 'group1',
                name: 'Status',
                type: 'select',
                object_type: 'card',
                target_id: 'channel1',
                target_type: 'channel',
                protected: false,
                create_at: 1,
                update_at: 1,
                delete_at: 0,
                created_by: 'user1',
                updated_by: 'user1',
            }];

            await operator.handlePropertyFields({fields, prepareRecordsOnly: false});

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: fields,
                tableName: PROPERTY_FIELD,
                prepareRecordsOnly: false,
                transformer: transformPropertyFieldRecord,
            }, 'handlePropertyFields');
        });

        it('should return [] without calling handleRecords when fields is empty', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handlePropertyFields({fields: [], prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('=> handlePropertyValues', () => {
        it('should delegate to handleRecords with the property value transformer and prepareRecordsOnly: true', async () => {
            expect.assertions(2);

            const originalHandleRecords = operator.handleRecords;
            operator.handleRecords = jest.fn().mockResolvedValue([]);

            const values: PropertyValue[] = [{
                id: 'value1',
                field_id: 'field1',
                target_id: 'post1',
                target_type: 'post',
                group_id: 'group1',
                value: 'Done',
                create_at: 1,
                update_at: 1,
                delete_at: 0,
                created_by: 'user1',
                updated_by: 'user1',
            }];

            await operator.handlePropertyValues({values, prepareRecordsOnly: true});

            expect(operator.handleRecords).toHaveBeenCalledTimes(1);
            expect(operator.handleRecords).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: values,
                tableName: PROPERTY_VALUE,
                prepareRecordsOnly: true,
                transformer: transformPropertyValueRecord,
            }, 'handlePropertyValues');

            operator.handleRecords = originalHandleRecords;
        });

        it('should return [] without calling handleRecords when values is empty', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handlePropertyValues({values: [], prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
