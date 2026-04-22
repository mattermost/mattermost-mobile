// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
    transformViewRecord,
} from '@database/operator/server_data_operator/transformers/boards';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

import type {PropertyValueModel, ViewModel} from '@database/models/server';

const {PROPERTY_FIELD, PROPERTY_VALUE, VIEW} = MM_TABLES.SERVER;

describe('*** BOARDS Prepare Records Test ***', () => {
    describe('=> transformViewRecord', () => {
        it('should prepare a create record for the BoardView table', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'boards_view_create', setActive: true});
            expect(database).toBeTruthy();

            const preparedRecord = await transformViewRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'view1',
                        channel_id: 'channel1',
                        type: 'kanban',
                        creator_id: 'user1',
                        title: 'Roadmap',
                        description: 'Q3 roadmap view',
                        sort_order: 0,
                        props: {colorBy: 'status'},
                        create_at: 1,
                        update_at: 1,
                        delete_at: 0,
                    },
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe(VIEW);
        });

        it('should throw on non-create action without record', async () => {
            expect.assertions(2);

            const database = await createTestConnection({databaseName: 'boards_view_error', setActive: true});
            expect(database).toBeTruthy();

            await expect(transformViewRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
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
                    } as View,
                },
            })).rejects.toThrow('Record not found for non create action');
        });

        it('should preserve existing fields when partial payload omits them', async () => {
            expect.assertions(1);

            const existing = {
                id: 'view1',
                channelId: 'channel1',
                type: 'kanban',
                creatorId: 'user1',
                title: 'Roadmap',
                description: 'Original',
                sortOrder: 2,
                props: {colorBy: 'status'},
                createAt: 1,
                updateAt: 1,
                deleteAt: 0,
            };

            const mockRecord = {
                ...existing,
                _raw: {},
                prepareUpdate: jest.fn().mockImplementation((cb) => {
                    cb();
                    return mockRecord;
                }),
                collection: {table: VIEW},
            } as unknown as ViewModel;

            // Only title changes in partial payload.
            await transformViewRecord({
                action: OperationType.UPDATE,
                database: {} as never,
                value: {
                    record: mockRecord,
                    raw: {id: 'view1', title: 'New title'} as View,
                },
            });

            expect(mockRecord.description).toBe('Original');
        });
    });

    describe('=> transformPropertyFieldRecord', () => {
        it('should prepare a create record for the PropertyField table', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'boards_field_create', setActive: true});
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

            const database = await createTestConnection({databaseName: 'boards_field_error', setActive: true});
            expect(database).toBeTruthy();

            await expect(transformPropertyFieldRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {id: 'field1'} as PropertyField,
                },
            })).rejects.toThrow('Record not found for non create action');
        });
    });

    describe('=> transformPropertyValueRecord', () => {
        it('should prepare a create record for the PropertyValue table', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'boards_value_create', setActive: true});
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
