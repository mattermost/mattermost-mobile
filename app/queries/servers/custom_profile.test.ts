// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-lines */

import {random} from 'lodash';

import DatabaseManager from '@database/manager';
import {customProfileAttributeId} from '@utils/custom_profile_attribute';

import {
    getCustomProfileFieldById,
    observeCustomProfileFields,
    getCustomProfileAttribute,
    observeCustomProfileAttribute,
    observeCustomProfileAttributesByUserId,
    convertProfileAttributesToCustomAttributes,
    queryCustomProfileFields,
    queryCustomProfileAttributesByUserId,
    queryCustomProfileAttributesByFieldId,
    deleteCustomProfileAttributesByFieldId,
} from './custom_profile';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {CustomAttribute} from '@typings/api/custom_profile_attributes';

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

    describe('convertProfileAttributesToCustomAttributes', () => {
        it('should convert profile attributes to custom attributes', async () => {
            const fieldId1 = 'field1';
            const fieldId2 = 'field2';
            const userId = 'user1';

            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: fieldId1,
                        name: 'Test Field 1',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                        attrs: {sort_order: 1},
                    },
                    {
                        id: fieldId2,
                        name: 'Test Field 2',
                        type: 'select',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                        attrs: {sort_order: 0},
                    },
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleCustomProfileAttributes({
                attributes: [
                    {
                        id: `${fieldId1}_${userId}`,
                        field_id: fieldId1,
                        user_id: userId,
                        value: 'Value 1',
                    },
                    {
                        id: `${fieldId2}_${userId}`,
                        field_id: fieldId2,
                        user_id: userId,
                        value: 'Value 2',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const attributes = await queryCustomProfileAttributesByUserId(database, userId).fetch();
            const customAttributes = await convertProfileAttributesToCustomAttributes(database, attributes);

            expect(customAttributes.length).toBe(2);
            if (customAttributes[0].id === fieldId1) {
                expect(customAttributes[0].id).toBe(fieldId1);
                expect(customAttributes[0].name).toBe('Test Field 1');
                expect(customAttributes[0].value).toBe('Value 1');
                expect(customAttributes[0].sort_order).toBe(1);

                expect(customAttributes[1].id).toBe(fieldId2);
                expect(customAttributes[1].name).toBe('Test Field 2');
                expect(customAttributes[1].value).toBe('Value 2');
                expect(customAttributes[1].sort_order).toBe(0);
            } else {
                expect(customAttributes[0].id).toBe(fieldId2);
                expect(customAttributes[0].name).toBe('Test Field 2');
                expect(customAttributes[0].value).toBe('Value 2');
                expect(customAttributes[0].sort_order).toBe(0);

                expect(customAttributes[1].id).toBe(fieldId1);
                expect(customAttributes[1].name).toBe('Test Field 1');
                expect(customAttributes[1].value).toBe('Value 1');
                expect(customAttributes[1].sort_order).toBe(1);
            }
        });

        it('should sort custom attributes by custom sort function', async () => {
            const fieldId1 = 'field1';
            const fieldId2 = 'field2';
            const userId = 'user1';

            await operator.handleCustomProfileFields({
                fields: [
                    {
                        id: fieldId1,
                        name: 'Test Field 1',
                        type: 'text',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                        attrs: {sort_order: 1},
                    },
                    {
                        id: fieldId2,
                        name: 'Test Field 2',
                        type: 'select',
                        delete_at: 0,
                        group_id: '',
                        target_id: '',
                        target_type: 'user',
                        create_at: 1000,
                        update_at: 1000,
                        attrs: {sort_order: 0},
                    },
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleCustomProfileAttributes({
                attributes: [
                    {
                        id: `${fieldId1}_${userId}`,
                        field_id: fieldId1,
                        user_id: userId,
                        value: 'Value 1',
                    },
                    {
                        id: `${fieldId2}_${userId}`,
                        field_id: fieldId2,
                        user_id: userId,
                        value: 'Value 2',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const attributes = await queryCustomProfileAttributesByUserId(database, userId).fetch();

            // Sort by sort_order in ascending order
            const customAttributes = await convertProfileAttributesToCustomAttributes(
                database,
                attributes,
                (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
            );

            expect(customAttributes.length).toBe(2);
            expect(customAttributes[0].id).toBe(fieldId2); // This has sort_order 0
            expect(customAttributes[1].id).toBe(fieldId1); // This has sort_order 1
        });

        it('should handle empty attributes array', async () => {
            const customAttributes = await convertProfileAttributesToCustomAttributes(database, []);
            expect(customAttributes).toEqual([]);
        });

        it('should handle null attributes', async () => {
            const customAttributes = await convertProfileAttributesToCustomAttributes(database, null);
            expect(customAttributes).toEqual([]);
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

    describe('Performance Tests', () => {
        it('should profile convertProfileAttributesToCustomAttributes performance', async () => {
            jest.setTimeout(30000); // Increase timeout for this test

            // Create a larger dataset to test performance
            const fieldCount = 200;
            const userCount = 5;

            // Create fields
            const fields = Array.from({length: fieldCount}, (_, i) => ({
                id: `field${i}`,
                name: `Test Field ${i}`,
                type: 'text',
                delete_at: 0,
                group_id: '',
                target_id: '',
                target_type: 'user',
                create_at: 1000,
                update_at: 1000,
                attrs: {sort_order: i + random(0, 1000)},
            }));

            await operator.handleCustomProfileFields({
                fields,
                prepareRecordsOnly: false,
            });

            // Create attributes (10 attributes per user)
            const attributes = [];
            for (let u = 0; u < userCount; u++) {
                const userId = `user${u}`;
                for (let f = 0; f < fieldCount; f++) {
                    const fieldId = `field${f}`;
                    attributes.push({
                        id: customProfileAttributeId(fieldId, userId),
                        field_id: fieldId,
                        user_id: userId,
                        value: `Value for user ${u} field ${f}`,
                    });
                }
            }

            await operator.handleCustomProfileAttributes({
                attributes,
                prepareRecordsOnly: false,
            });

            // Profile the function for one specific user
            const userId = 'user0';
            const userAttributes = await queryCustomProfileAttributesByUserId(database, userId).fetch();

            console.log(`Testing conversion of ${userAttributes.length} attributes`);

            // Run the function once to get performance data
            const sortFn = (a: CustomAttribute, b: CustomAttribute) => (a.sort_order || 0) - (b.sort_order || 0);

            const startTime = performance.now();
            await convertProfileAttributesToCustomAttributes(database, userAttributes, sortFn);
            const endTime = performance.now();
            console.log(`Time with sorting: ${(endTime - startTime).toFixed(2)}ms`);

            expect(true).toBe(true); // No assertions needed for profiling
        });
    });
});
