// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
} from '@database/operator/server_data_operator/transformers/properties';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

import type {PropertyValueModel} from '@database/models/server';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

describe('*** PROPERTIES Prepare Records Test ***', () => {
    describe('=> transformPropertyFieldRecord', () => {
        it('should prepare a create record for the PropertyField table', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'properties_field_create', setActive: true});
            expect(database).toBeTruthy();

            const preparedRecord = await transformPropertyFieldRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'field1',
                        group_id: 'group1',
                        name: 'Status',
                        type: 'select',
                        attrs: {options: [{id: 'opt1', name: 'Open'}]},
                        object_type: 'card',
                        target_id: 'channel1',
                        target_type: 'channel',
                        protected: false,
                        create_at: 1,
                        update_at: 1,
                        delete_at: 0,
                        created_by: 'user1',
                        updated_by: 'user1',
                    },
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe(PROPERTY_FIELD);
        });

        it('should throw on non-create action without record', async () => {
            expect.assertions(2);

            const database = await createTestConnection({databaseName: 'properties_field_error', setActive: true});
            expect(database).toBeTruthy();

            expect(() => transformPropertyFieldRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {id: 'field1'} as PropertyField,
                },
            })).toThrow('Record not found for non create action');
        });
    });

    describe('=> transformPropertyValueRecord', () => {
        it('should prepare a create record for the PropertyValue table', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'properties_value_create', setActive: true});
            expect(database).toBeTruthy();

            const preparedRecord = await transformPropertyValueRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
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
                    },
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe(PROPERTY_VALUE);
        });

        it('should preserve existing value when partial payload omits it', async () => {
            expect.assertions(1);

            const mockRecord = {
                id: 'value1',
                fieldId: 'field1',
                targetId: 'post1',
                targetType: 'post',
                groupId: 'group1',
                value: 'original',
                createAt: 1,
                updateAt: 1,
                deleteAt: 0,
                createdBy: 'user1',
                updatedBy: 'user1',
                _raw: {},
                prepareUpdate: jest.fn().mockImplementation((cb) => {
                    cb();
                    return mockRecord;
                }),
                collection: {table: PROPERTY_VALUE},
            } as unknown as PropertyValueModel;

            await transformPropertyValueRecord({
                action: OperationType.UPDATE,
                database: {} as never,
                value: {
                    record: mockRecord,
                    raw: {id: 'value1', updated_by: 'user2'} as PropertyValue,
                },
            });

            expect(mockRecord.value).toBe('original');
        });
    });
});
