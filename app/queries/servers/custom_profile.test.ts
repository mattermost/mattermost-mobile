// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-lines */

import DatabaseManager from '@database/manager';

import {
    getCustomProfileFieldById,
    observeCustomProfileFields,
    getCustomProfileAttribute,
    observeCustomProfileAttribute,
    observeCustomProfileAttributesByUserId,
    queryCustomProfileFields,
    queryCustomProfileAttributesByUserId,
    queryCustomProfileAttributesByFieldId,
    deleteCustomProfileAttributesByFieldId,
} from './custom_profile';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

describe('Custom Profile Queries', () => {
    const serverUrl = 'custom-profile.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('getCustomProfileFieldById', () => {
        it('should return custom profile field by id', async () => {
            const fieldId = 'field1';
            await operator.handleCustomProfileFields({
                fields: [{
                    id: fieldId,
                    name: 'Test Field',
                    type: 'text',
                    delete_at: 0,
                    group_id: '',
                    target_id: '',
                    target_type: 'user',
                    create_at: 1000,
                    update_at: 1000,
                }],
                prepareRecordsOnly: false,
            });

            const field = await getCustomProfileFieldById(database, fieldId);
            expect(field).not.toBeUndefined();
            expect(field?.name).toBe('Test Field');
        });

        it('should return undefined for non-existent field', async () => {
            const field = await getCustomProfileFieldById(database, 'nonexistent');
            expect(field).toBeUndefined();
        });
    });

    describe('observeCustomProfileFields', () => {
        it('should observe all custom profile fields', (done) => {
            const errorFn = jest.fn();

            operator.handleCustomProfileFields({
                fields: [
                    {
                        id: 'field1',
                        name: 'Test Field 1',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                    {
                        id: 'field2',
                        name: 'Test Field 2',
                        type: 'select',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeCustomProfileFields(database).subscribe({
                    next: (fields) => {
                        expect(fields.length).toBe(2);
                        expect(fields[0].name).toBe('Test Field 1');
                        expect(fields[1].name).toBe('Test Field 2');
                        done();
                    },
                    error: errorFn,
                });
            });
            expect(errorFn).toHaveBeenCalledTimes(0);
        });
    });

    describe('getCustomProfileAttribute', () => {
        it('should return custom profile attribute by field id and user id', async () => {
            const fieldId = 'field1';
            const userId = 'user1';

            await operator.handleCustomProfileFields({
                fields: [{
                    id: fieldId,
                    name: 'Test Field',
                    type: 'text',
                    delete_at: 0,
                    group_id: '',
                    target_id: '',
                    target_type: 'user',
                    create_at: 1000,
                    update_at: 1000,
                }],
                prepareRecordsOnly: false,
            });

            await operator.handleCustomProfileAttributes({
                attributes: [{
                    id: `${fieldId}_${userId}`,
                    field_id: fieldId,
                    user_id: userId,
                    value: 'Test Value',
                }],
                prepareRecordsOnly: false,
            });

            const attribute = await getCustomProfileAttribute(database, fieldId, userId);
            expect(attribute).not.toBeUndefined();
            expect(attribute?.value).toBe('Test Value');
        });

        it('should return undefined for non-existent attribute', async () => {
            const attribute = await getCustomProfileAttribute(database, 'nonexistent', 'nonexistent');
            expect(attribute).toBeUndefined();
        });
    });

    describe('observeCustomProfileAttribute', () => {
        it('should observe a custom profile attribute', (done) => {
            const fieldId = 'field1';
            const userId = 'user1';

            Promise.all([
                operator.handleCustomProfileFields({
                    fields: [{
                        id: fieldId,
                        name: 'Test Field',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    }],
                    prepareRecordsOnly: false,
                }),
                operator.handleCustomProfileAttributes({
                    attributes: [{
                        id: `${fieldId}_${userId}`,
                        field_id: fieldId,
                        user_id: userId,
                        value: 'Test Value',
                    }],
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeCustomProfileAttribute(database, fieldId, userId).subscribe({
                    next: (attribute) => {
                        expect(attribute).not.toBeUndefined();
                        expect(attribute?.value).toBe('Test Value');
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should return undefined for non-existent attribute', (done) => {
            observeCustomProfileAttribute(database, 'nonexistent', 'nonexistent').subscribe({
                next: (attribute) => {
                    expect(attribute).toBeUndefined();
                    done();
                },
                error: done,
            });
        });
    });

    describe('observeCustomProfileAttributesByUserId', () => {
        it('should observe all custom profile attributes for a user', (done) => {
            const userId = 'user1';

            Promise.all([
                operator.handleCustomProfileFields({
                    fields: [
                        {
                            id: 'field1',
                            name: 'Test Field 1',
                            type: 'text',
                            delete_at: 0,
                            group_id: '',
                            target_id: '',
                            target_type: 'user',
                            create_at: 1000,
                            update_at: 1000,
                        },
                        {
                            id: 'field2',
                            name: 'Test Field 2',
                            type: 'select',
                            delete_at: 0,
                            group_id: '',
                            target_id: '',
                            target_type: 'user',
                            create_at: 1000,
                            update_at: 1000,
                        },
                    ],
                    prepareRecordsOnly: false,
                }),
                operator.handleCustomProfileAttributes({
                    attributes: [
                        {
                            id: `field1_${userId}`,
                            field_id: 'field1',
                            user_id: userId,
                            value: 'Value 1',
                        },
                        {
                            id: `field2_${userId}`,
                            field_id: 'field2',
                            user_id: userId,
                            value: 'Value 2',
                        },
                    ],
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeCustomProfileAttributesByUserId(database, userId).subscribe({
                    next: (attributes) => {
                        expect(attributes.length).toBe(2);
                        if (attributes[0].id === 'field1_user1') {
                            expect(attributes[0].value).toBe('Value 1');
                            expect(attributes[1].value).toBe('Value 2');
                        } else if (attributes[0].id === 'field2_user1') {
                            expect(attributes[0].value).toBe('Value 2');
                            expect(attributes[1].value).toBe('Value 1');
                        }
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should return empty array for non-existent user', (done) => {
            observeCustomProfileAttributesByUserId(database, 'nonexistent').subscribe({
                next: (attributes) => {
                    expect(attributes.length).toBe(0);
                    done();
                },
                error: done,
            });
        });
    });

    describe('queryCustomProfileFields', () => {
        it('should query all custom profile fields', async () => {
            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: 'field1',
                        name: 'Test Field 1',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                    {
                        id: 'field2',
                        name: 'Test Field 2',
                        type: 'select',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                ],
                prepareRecordsOnly: false,
            });

            const fields = await queryCustomProfileFields(database).fetch();
            expect(fields.length).toBe(2);
        });
    });

    describe('queryCustomProfileAttributesByUserId', () => {
        it('should query all attributes for a user', async () => {
            const userId = 'user1';

            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: 'field1',
                        name: 'Test Field 1',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                    {
                        id: 'field2',
                        name: 'Test Field 2',
                        type: 'select',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleCustomProfileAttributes({
                attributes: [
                    {
                        id: `field1_${userId}`,
                        field_id: 'field1',
                        user_id: userId,
                        value: 'Value 1',
                    },
                    {
                        id: `field2_${userId}`,
                        field_id: 'field2',
                        user_id: userId,
                        value: 'Value 2',
                    },
                    {
                        id: 'field1_user2',
                        field_id: 'field1',
                        user_id: 'user2',
                        value: 'Another value',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const attributes = await queryCustomProfileAttributesByUserId(database, userId).fetch();
            expect(attributes.length).toBe(2);
            if (attributes[0].id === 'field1_user1') {
                expect(attributes[0].fieldId).toBe('field1');
                expect(attributes[1].fieldId).toBe('field2');
            } else if (attributes[0].id === 'field2_user1') {
                expect(attributes[0].fieldId).toBe('field2');
                expect(attributes[1].fieldId).toBe('field1');
            }
        });
    });

    describe('queryCustomProfileAttributesByFieldId', () => {
        it('should query all attributes for a field', async () => {
            const fieldId = 'field1';

            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: fieldId,
                        name: 'Test Field',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleCustomProfileAttributes({
                attributes: [
                    {
                        id: `${fieldId}_user1`,
                        field_id: fieldId,
                        user_id: 'user1',
                        value: 'Value 1',
                    },
                    {
                        id: `${fieldId}_user2`,
                        field_id: fieldId,
                        user_id: 'user2',
                        value: 'Value 2',
                    },
                    {
                        id: 'field2_user1',
                        field_id: 'field2',
                        user_id: 'user1',
                        value: 'Another value',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const attributes = await queryCustomProfileAttributesByFieldId(database, fieldId).fetch();
            expect(attributes.length).toBe(2);
            if (attributes[0].id === 'field1_user1') {
                expect(attributes[0].userId).toBe('user1');
                expect(attributes[1].userId).toBe('user2');
            } else if (attributes[0].id === 'field2_user1') {
                expect(attributes[0].userId).toBe('user2');
                expect(attributes[1].userId).toBe('user1');
            }
        });
    });

    describe('deleteCustomProfileAttributesByFieldId', () => {
        it('should delete all attributes for a field', async () => {
            const fieldId = 'field1';

            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: fieldId,
                        name: 'Test Field',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleCustomProfileAttributes({
                attributes: [
                    {
                        id: `${fieldId}_user1`,
                        field_id: fieldId,
                        user_id: 'user1',
                        value: 'Value 1',
                    },
                    {
                        id: `${fieldId}_user2`,
                        field_id: fieldId,
                        user_id: 'user2',
                        value: 'Value 2',
                    },
                    {
                        id: 'field2_user1',
                        field_id: 'field2',
                        user_id: 'user1',
                        value: 'Another value',
                    },
                ],
                prepareRecordsOnly: false,
            });

            // Check initial state
            let field1Attributes = await queryCustomProfileAttributesByFieldId(database, fieldId).fetch();
            let field2Attributes = await queryCustomProfileAttributesByFieldId(database, 'field2').fetch();
            expect(field1Attributes.length).toBe(2);
            expect(field2Attributes.length).toBe(1);

            // Delete attributes for field1
            await deleteCustomProfileAttributesByFieldId(database, fieldId);

            // Verify deletion
            field1Attributes = await queryCustomProfileAttributesByFieldId(database, fieldId).fetch();
            field2Attributes = await queryCustomProfileAttributesByFieldId(database, 'field2').fetch();
            expect(field1Attributes.length).toBe(0);
            expect(field2Attributes.length).toBe(1);
        });

        it('should delete attributes with custom batch size', async () => {
            const fieldId = 'field3';
            const attributeCount = 5;

            // Create a field
            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: fieldId,
                        name: 'Batch Test Field',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                    },
                ],
                prepareRecordsOnly: false,
            });

            // Create multiple attributes for testing batch deletion
            const attributes = Array.from({length: attributeCount}, (_, i) => ({
                id: `${fieldId}_user${i}`,
                field_id: fieldId,
                user_id: `user${i}`,
                value: `Value ${i}`,
            }));

            await operator.handleCustomProfileAttributes({
                attributes,
                prepareRecordsOnly: false,
            });

            // Verify initial state
            let fieldAttributes = await queryCustomProfileAttributesByFieldId(database, fieldId).fetch();
            expect(fieldAttributes.length).toBe(attributeCount);

            // Delete with custom batch size (smaller than total count)
            await deleteCustomProfileAttributesByFieldId(database, fieldId, 2);

            // Verify all attributes were deleted despite the small batch size
            fieldAttributes = await queryCustomProfileAttributesByFieldId(database, fieldId).fetch();
            expect(fieldAttributes.length).toBe(0);
        });

        it('should handle case when no attributes exist', async () => {
            const nonExistentFieldId = 'nonexistent_field';

            // Try to delete attributes for a field that doesn't exist
            await deleteCustomProfileAttributesByFieldId(database, nonExistentFieldId);

            // Function should complete without errors
            expect(true).toBe(true);
        });
    });
});
