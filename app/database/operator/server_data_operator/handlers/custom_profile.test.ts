// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformCustomProfileFieldRecord,
    transformCustomProfileAttributeRecord,
} from '@database/operator/server_data_operator/transformers/custom_profile';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {CustomProfileField, CustomProfileAttribute} from '@typings/api/custom_profile_attributes';

describe('*** Operator: Custom Profile Handlers tests ***', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';

    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    it('=> handleCustomProfileFields: should write to CustomProfileField table', async () => {
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

    it('=> handleCustomProfileFields: should handle empty fields array', async () => {
        expect.assertions(1);

        const result = await operator.handleCustomProfileFields({
            fields: [],
            prepareRecordsOnly: false,
        });

        expect(result).toEqual([]);
    });

    it('=> handleCustomProfileAttributes: should write to CustomProfileAttribute table', async () => {
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

    it('=> handleCustomProfileAttributes: should handle empty attributes array', async () => {
        expect.assertions(1);

        const result = await operator.handleCustomProfileAttributes({
            attributes: [],
            prepareRecordsOnly: false,
        });

        expect(result).toEqual([]);
    });

    it('=> handleCustomProfileFields: should handle duplicate fields by using unique id', async () => {
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

        // Should only include one record due to unique id
        expect(spyOnHandleRecords).toHaveBeenCalledWith(
            expect.objectContaining({
                createOrUpdateRawValues: [fields[1]],
            }),
            'handleCustomProfileFields',
        );
    });

    it('=> handleCustomProfileAttributes: should handle duplicate attributes by using unique id', async () => {
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

        // Should only include one record due to unique id
        expect(spyOnHandleRecords).toHaveBeenCalledWith(
            expect.objectContaining({
                createOrUpdateRawValues: [attributes[1]],
            }),
            'handleCustomProfileAttributes',
        );
    });
});
