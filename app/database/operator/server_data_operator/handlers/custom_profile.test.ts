// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformCustomProfileFieldRecord,
    transformCustomProfileAttributeRecord,
} from '@database/operator/server_data_operator/transformers/custom_profile';
import * as CustomProfileQueries from '@queries/servers/custom_profile';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {CustomProfileField, CustomProfileAttribute} from '@typings/api/custom_profile_attributes';

// Mock the deleteCustomProfileAttributesByFieldId function
jest.mock('@queries/servers/custom_profile', () => ({
    ...jest.requireActual('@queries/servers/custom_profile'),
    deleteCustomProfileAttributesByFieldId: jest.fn().mockResolvedValue(undefined),
}));

describe('*** Operator: Custom Profile Handlers tests ***', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';

    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('=> handleCustomProfileFields', () => {
        it('should write to CustomProfileField table', async () => {
            expect.assertions(2);

            const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
            const fields: CustomProfileField[] = [
                {
                    id: 'field1',
                    name: 'Test Field',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 0,
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
            ];

            await operator.handleCustomProfileFields({
                fields,
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
            expect(spyOnHandleRecords).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: fields,
                tableName: MM_TABLES.SERVER.CUSTOM_PROFILE_FIELD,
                prepareRecordsOnly: false,
                transformer: transformCustomProfileFieldRecord,
            }, 'handleCustomProfileFields');
        });

        it('should delete custom profile attributes for fields with delete_at !== 0', async () => {
            expect.assertions(3);

            const spyOnDeleteAttributes = jest.spyOn(CustomProfileQueries, 'deleteCustomProfileAttributesByFieldId');

            const fields: CustomProfileField[] = [
                {
                    id: 'field1',
                    name: 'Test Field 1',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 0, // Not deleted
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
                {
                    id: 'field2',
                    name: 'Test Field 2',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 1607683820173, // Deleted field
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
                {
                    id: 'field3',
                    name: 'Test Field 3',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 1607683920173, // Deleted field
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
            ];

            await operator.handleCustomProfileFields({
                fields,
                prepareRecordsOnly: false,
            });

            // Verify that deleteCustomProfileAttributesByFieldId was called for the deleted fields
            expect(spyOnDeleteAttributes).toHaveBeenCalledTimes(2);
            expect(spyOnDeleteAttributes).toHaveBeenCalledWith(operator.database, 'field2');
            expect(spyOnDeleteAttributes).toHaveBeenCalledWith(operator.database, 'field3');
        });

        it('should properly pass prepareRecordsOnly when set to true', async () => {
            expect.assertions(2);

            const originalHandleRecords = operator.handleRecords;
            operator.handleRecords = jest.fn().mockResolvedValue([]);

            const fields: CustomProfileField[] = [
                {
                    id: 'field1',
                    name: 'Test Field',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 0,
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
            ];

            await operator.handleCustomProfileFields({
                fields,
                prepareRecordsOnly: true,
            });

            expect(operator.handleRecords).toHaveBeenCalledTimes(1);
            expect(operator.handleRecords).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: fields,
                tableName: MM_TABLES.SERVER.CUSTOM_PROFILE_FIELD,
                prepareRecordsOnly: true,
                transformer: transformCustomProfileFieldRecord,
            }, 'handleCustomProfileFields');

            operator.handleRecords = originalHandleRecords;
        });

        it('should handle empty fields array', async () => {
            expect.assertions(1);

            const result = await operator.handleCustomProfileFields({
                fields: [],
                prepareRecordsOnly: false,
            });

            expect(result).toEqual([]);
        });

        it('should handle duplicate fields by using unique id', async () => {
            expect.assertions(2);

            const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
            const fields: CustomProfileField[] = [
                {
                    id: 'field1',
                    name: 'Test Field 1',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 0,
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
                {
                    id: 'field1',
                    name: 'Test Field 2',
                    type: 'text',
                    create_at: 1607683720173,
                    update_at: 1607683720173,
                    delete_at: 0,
                    group_id: 'group1',
                    target_id: 'target1',
                    target_type: 'user',
                    attrs: {},
                },
            ];

            await operator.handleCustomProfileFields({
                fields,
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);

            expect(spyOnHandleRecords).toHaveBeenCalledWith(
                expect.objectContaining({
                    createOrUpdateRawValues: [fields[1]],
                }),
                'handleCustomProfileFields',
            );
        });
    });

    describe('=> handleCustomProfileAttributes', () => {
        it('should write to CustomProfileAttribute table', async () => {
            expect.assertions(2);

            const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
            const attributes: CustomProfileAttribute[] = [
                {
                    id: 'field1-user1',
                    field_id: 'field1',
                    user_id: 'user1',
                    value: 'Test Value',
                },
            ];

            await operator.handleCustomProfileAttributes({
                attributes,
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
            expect(spyOnHandleRecords).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: attributes,
                tableName: MM_TABLES.SERVER.CUSTOM_PROFILE_ATTRIBUTE,
                prepareRecordsOnly: false,
                transformer: transformCustomProfileAttributeRecord,
            }, 'handleCustomProfileAttributes');
        });

        it('should properly pass prepareRecordsOnly when set to true', async () => {
            expect.assertions(2);

            const originalHandleRecords = operator.handleRecords;
            operator.handleRecords = jest.fn().mockResolvedValue([]);

            const attributes: CustomProfileAttribute[] = [
                {
                    id: 'field1-user1',
                    field_id: 'field1',
                    user_id: 'user1',
                    value: 'Test Value',
                },
            ];

            await operator.handleCustomProfileAttributes({
                attributes,
                prepareRecordsOnly: true,
            });

            expect(operator.handleRecords).toHaveBeenCalledTimes(1);
            expect(operator.handleRecords).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: attributes,
                tableName: MM_TABLES.SERVER.CUSTOM_PROFILE_ATTRIBUTE,
                prepareRecordsOnly: true,
                transformer: transformCustomProfileAttributeRecord,
            }, 'handleCustomProfileAttributes');

            // Restore original method
            operator.handleRecords = originalHandleRecords;
        });

        it('should handle empty attributes array', async () => {
            expect.assertions(1);

            const result = await operator.handleCustomProfileAttributes({
                attributes: [],
                prepareRecordsOnly: false,
            });

            expect(result).toEqual([]);
        });

        it('should handle duplicate attributes by using unique id', async () => {
            expect.assertions(2);

            const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
            const attributes: CustomProfileAttribute[] = [
                {
                    id: 'field1-user1',
                    field_id: 'field1',
                    user_id: 'user1',
                    value: 'Test Value 1',
                },
                {
                    id: 'field1-user1',
                    field_id: 'field1',
                    user_id: 'user1',
                    value: 'Test Value 2',
                },
            ];

            await operator.handleCustomProfileAttributes({
                attributes,
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);

            expect(spyOnHandleRecords).toHaveBeenCalledWith(
                expect.objectContaining({
                    createOrUpdateRawValues: [attributes[1]],
                }),
                'handleCustomProfileAttributes',
            );
        });
    });

});
