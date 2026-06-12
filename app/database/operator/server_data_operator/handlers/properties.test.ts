// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
} from '@database/operator/server_data_operator/transformers/properties';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';
import type ServerDataOperator from '@database/operator/server_data_operator';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

const makeField = (overrides?: Partial<PropertyField>): PropertyField => ({
    id: 'field1',
    group_id: 'group1',
    name: 'system_classification',
    type: 'select',
    object_type: 'system',
    target_id: '',
    target_type: 'system',
    protected: false,
    create_at: 1,
    update_at: 1,
    delete_at: 0,
    created_by: 'user1',
    updated_by: 'user1',
    ...overrides,
});

const makeValue = (overrides?: Partial<PropertyValue<string>>): PropertyValue<string> => ({
    id: 'value1',
    field_id: 'field1',
    target_id: 'target1',
    target_type: 'channel',
    group_id: 'group1',
    value: 'opt-1',
    create_at: 1,
    update_at: 1,
    delete_at: 0,
    created_by: 'user1',
    updated_by: 'user1',
    ...overrides,
});

describe('*** Operator: Properties Handlers tests ***', () => {
    let operator: ServerDataOperator;
    const serverUrl = `propertiesHandler.test.${Date.now()}.com`;

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
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

    const fetchFields = (groupId?: string) => {
        const collection = operator.database.get<PropertyFieldModel>(PROPERTY_FIELD);
        return (groupId ? collection.query(Q.where('group_id', groupId)) : collection.query()).fetch();
    };

    const fetchValues = (targetId?: string) => {
        const collection = operator.database.get<PropertyValueModel>(PROPERTY_VALUE);
        return (targetId ? collection.query(Q.where('target_id', targetId)) : collection.query()).fetch();
    };

    describe('=> handlePropertyFieldsByGroupId', () => {
        it('should upsert active fields and delete stale fields scoped to the group', async () => {
            await operator.handlePropertyFields({fields: [
                makeField({id: 'keep'}),
                makeField({id: 'stale'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyFieldsByGroupId({
                groupId: 'group1',
                fields: [makeField({id: 'keep'}), makeField({id: 'new'})],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchFields()).map((f) => f.id).sort();
            expect(ids).toEqual(['keep', 'new']);
        });

        it('should treat soft-deleted incoming fields as deletions', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'gone'})], prepareRecordsOnly: false});

            await operator.handlePropertyFieldsByGroupId({
                groupId: 'group1',
                fields: [makeField({id: 'gone', delete_at: 5000})],
                prepareRecordsOnly: false,
            });

            expect(await fetchFields()).toHaveLength(0);
        });

        it('should leave fields from other groups untouched', async () => {
            await operator.handlePropertyFields({fields: [
                makeField({id: 'mine', group_id: 'group1'}),
                makeField({id: 'theirs', group_id: 'group2'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyFieldsByGroupId({
                groupId: 'group1',
                fields: [],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchFields()).map((f) => f.id);
            expect(ids).toEqual(['theirs']);
        });

        it('should not write to the database when prepareRecordsOnly is true', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'stale'})], prepareRecordsOnly: false});

            const models = await operator.handlePropertyFieldsByGroupId({
                groupId: 'group1',
                fields: [makeField({id: 'new'})],
                prepareRecordsOnly: true,
            });

            expect(models).toHaveLength(2);
            const ids = (await fetchFields()).map((f) => f.id);
            expect(ids).toEqual(['stale']);
        });
    });

    describe('=> handlePropertyValuesByTargetId', () => {
        it('should upsert active values and delete stale values scoped to the target', async () => {
            await operator.handlePropertyValues({values: [
                makeValue({id: 'keep', target_id: 'target1'}),
                makeValue({id: 'stale', target_id: 'target1'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyValuesByTargetId({
                targetId: 'target1',
                values: [makeValue({id: 'keep', target_id: 'target1'}), makeValue({id: 'new', target_id: 'target1'})],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchValues()).map((v) => v.id).sort();
            expect(ids).toEqual(['keep', 'new']);
        });

        it('should leave values for other targets untouched', async () => {
            await operator.handlePropertyValues({values: [
                makeValue({id: 'mine', target_id: 'target1'}),
                makeValue({id: 'theirs', target_id: 'target2'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyValuesByTargetId({
                targetId: 'target1',
                values: [],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchValues()).map((v) => v.id);
            expect(ids).toEqual(['theirs']);
        });

        it('should not write to the database when prepareRecordsOnly is true', async () => {
            await operator.handlePropertyValues({values: [makeValue({id: 'stale', target_id: 'target1'})], prepareRecordsOnly: false});

            const models = await operator.handlePropertyValuesByTargetId({
                targetId: 'target1',
                values: [makeValue({id: 'new', target_id: 'target1'})],
                prepareRecordsOnly: true,
            });

            expect(models).toHaveLength(2);
            const ids = (await fetchValues()).map((v) => v.id);
            expect(ids).toEqual(['stale']);
        });
    });

    describe('=> handleDeletePropertyField', () => {
        it('should delete the field and its values by id', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'field1'})], prepareRecordsOnly: false});
            await operator.handlePropertyValues({values: [
                makeValue({id: 'v1', field_id: 'field1'}),
                makeValue({id: 'v2', field_id: 'other'}),
            ],
            prepareRecordsOnly: false});

            await operator.handleDeletePropertyField({fieldId: 'field1', prepareRecordsOnly: false});

            expect(await fetchFields()).toHaveLength(0);
            const valueIds = (await fetchValues()).map((v) => v.id);
            expect(valueIds).toEqual(['v2']);
        });

        it('should be a no-op when the field does not exist', async () => {
            const models = await operator.handleDeletePropertyField({fieldId: 'missing', prepareRecordsOnly: false});
            expect(models).toEqual([]);
        });
    });

    describe('=> handleDeletePropertyFieldsByName', () => {
        it('should delete fields matching the names and their values', async () => {
            await operator.handlePropertyFields({fields: [
                makeField({id: 'sys', name: 'system_classification'}),
                makeField({id: 'chan', name: 'channel_classification'}),
                makeField({id: 'other', name: 'some_other_field'}),
            ],
            prepareRecordsOnly: false});
            await operator.handlePropertyValues({values: [
                makeValue({id: 'sv', field_id: 'sys'}),
                makeValue({id: 'ov', field_id: 'other'}),
            ],
            prepareRecordsOnly: false});

            await operator.handleDeletePropertyFieldsByName({
                names: ['system_classification', 'channel_classification'],
                prepareRecordsOnly: false,
            });

            const fieldIds = (await fetchFields()).map((f) => f.id);
            expect(fieldIds).toEqual(['other']);
            const valueIds = (await fetchValues()).map((v) => v.id);
            expect(valueIds).toEqual(['ov']);
        });

        it('should be a no-op when no fields match', async () => {
            const models = await operator.handleDeletePropertyFieldsByName({names: ['nope'], prepareRecordsOnly: false});
            expect(models).toEqual([]);
        });
    });
});
