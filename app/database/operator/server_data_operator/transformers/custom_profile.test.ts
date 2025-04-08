// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType, MM_TABLES} from '@constants/database';
import {transformCustomProfileFieldRecord, transformCustomProfileAttributeRecord} from '@database/operator/server_data_operator/transformers/custom_profile';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

import type {CustomProfileFieldModel} from '@database/models/server';
import type {CustomProfileAttribute} from '@typings/api/custom_profile_attributes';

describe('*** CUSTOM PROFILE Prepare Records Test ***', () => {
    describe('=> transformCustomProfileFieldRecord', () => {
        it('should return a record of type CustomProfileField', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'custom_profile_field_prepare_records', setActive: true});
            expect(database).toBeTruthy();

            const preparedRecord = await transformCustomProfileFieldRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'field1',
                        group_id: 'group1',
                        name: 'Test Field',
                        type: 'text',
                        target_id: 'target1',
                        target_type: 'user',
                        create_at: 1596032651748,
                        update_at: 1596032651748,
                        delete_at: 0,
                        attrs: {required: true},
                    },
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe(MM_TABLES.SERVER.CUSTOM_PROFILE_FIELD);
        });

        it('should handle update action', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'custom_profile_field_update_records', setActive: true});
            expect(database).toBeTruthy();

            const mockRecord = {
                id: 'field1',
                groupId: 'group1',
                name: 'Original Field',
                type: 'text',
                targetId: 'target1',
                targetType: 'user',
                createAt: 1596032651748,
                updateAt: 1596032651748,
                deleteAt: 0,
                attrs: {required: true},
                _raw: {},
                _isEditing: false,
                _preparedState: null,
                customProfileAttributes: [],
                prepare: jest.fn(),
                observe: jest.fn(),
                update: jest.fn(),
                destroyPermanently: jest.fn(),
                markAsDeleted: jest.fn(),
                prepareUpdate: jest.fn().mockImplementation((callback) => {
                    callback();
                    return mockRecord;
                }),
                collection: {table: 'CustomProfileField'},
            } as unknown as CustomProfileFieldModel;

            const preparedRecord = await transformCustomProfileFieldRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: mockRecord,
                    raw: {
                        id: 'field1',
                        group_id: 'group1',
                        name: 'Updated Field',
                        type: 'text',
                        target_id: 'target1',
                        target_type: 'user',
                        create_at: 1596032651748,
                        update_at: 1596032651749,
                        delete_at: 0,
                        attrs: {required: false},
                    },
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe('CustomProfileField');
        });

        it('should return a record of type CustomProfileAttribute', async () => {
            expect.assertions(4);

            const database = await createTestConnection({databaseName: 'custom_profile_attribute_prepare_records', setActive: true});
            expect(database).toBeTruthy();

            const preparedRecord = await transformCustomProfileAttributeRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'field1-user1',
                        field_id: 'field1',
                        user_id: 'user1',
                        value: 'Test Value',
                    } as CustomProfileAttribute,
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe('CustomProfileAttribute');
            expect(preparedRecord!.id).toBe('field1-user1');
        });

        it('should throw error for non-create action without record', async () => {
            expect.assertions(2);

            const database = await createTestConnection({databaseName: 'custom_profile_field_error_records', setActive: true});
            expect(database).toBeTruthy();

            try {
                await transformCustomProfileFieldRecord({
                    action: OperationType.UPDATE,
                    database: database!,
                    value: {
                        record: undefined,
                        raw: {
                            id: 'field1',
                            group_id: 'group1',
                            name: 'Test Field',
                            type: 'text',
                            target_id: 'target1',
                            target_type: 'user',
                            create_at: 1596032651748,
                            update_at: 1596032651748,
                            delete_at: 0,
                            attrs: {required: true},
                        },
                    },
                });

                // Should not reach here
                expect(true).toBe(false);
            } catch (error: any) {
                expect(error.message).toBe('Record not found for non create action');
            }
        });
    });
});
