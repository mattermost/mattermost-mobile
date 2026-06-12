// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

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

    const fetchFields = (groupId?: string) => {
        const collection = operator.database.get<PropertyFieldModel>(PROPERTY_FIELD);
        return (groupId ? collection.query(Q.where('group_id', groupId)) : collection.query()).fetch();
    };

    const fetchValues = (targetId?: string) => {
        const collection = operator.database.get<PropertyValueModel>(PROPERTY_VALUE);
        return (targetId ? collection.query(Q.where('target_id', targetId)) : collection.query()).fetch();
    };

    describe('=> handlePropertyFields (upsert & per-record delete)', () => {
        it('should upsert active fields', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'f1'}), makeField({id: 'f2'})], prepareRecordsOnly: false});

            const ids = (await fetchFields()).map((f) => f.id).sort();
            expect(ids).toEqual(['f1', 'f2']);
        });

        it('should return [] without writing when no fields and no groupId are passed', async () => {
            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handlePropertyFields({fields: [], prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should delete soft-deleted fields and cascade to their values', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'gone'}), makeField({id: 'kept'})], prepareRecordsOnly: false});
            await operator.handlePropertyValues({values: [
                makeValue({id: 'gv', field_id: 'gone'}),
                makeValue({id: 'kv', field_id: 'kept'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyFields({fields: [makeField({id: 'gone', delete_at: 5000})], prepareRecordsOnly: false});

            const fieldIds = (await fetchFields()).map((f) => f.id);
            expect(fieldIds).toEqual(['kept']);
            const valueIds = (await fetchValues()).map((v) => v.id);
            expect(valueIds).toEqual(['kv']);
        });

        it('should be a no-op when the soft-deleted field is not stored', async () => {
            const models = await operator.handlePropertyFields({fields: [makeField({id: 'missing', delete_at: 5000})], prepareRecordsOnly: false});
            expect(models).toEqual([]);
        });
    });

    describe('=> handlePropertyValues (upsert & per-record delete)', () => {
        it('should upsert active values', async () => {
            await operator.handlePropertyValues({values: [makeValue({id: 'v1'}), makeValue({id: 'v2'})], prepareRecordsOnly: false});

            const ids = (await fetchValues()).map((v) => v.id).sort();
            expect(ids).toEqual(['v1', 'v2']);
        });

        it('should return [] without writing when no values and no targetId are passed', async () => {
            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handlePropertyValues({values: [], prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should delete soft-deleted values', async () => {
            await operator.handlePropertyValues({values: [makeValue({id: 'gone'}), makeValue({id: 'kept'})], prepareRecordsOnly: false});

            await operator.handlePropertyValues({values: [makeValue({id: 'gone', delete_at: 5000})], prepareRecordsOnly: false});

            const ids = (await fetchValues()).map((v) => v.id);
            expect(ids).toEqual(['kept']);
        });
    });

    describe('=> handlePropertyFields (group sync)', () => {
        it('should upsert active fields and delete stale fields scoped to the group', async () => {
            await operator.handlePropertyFields({fields: [
                makeField({id: 'keep'}),
                makeField({id: 'stale'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyFields({
                groupId: 'group1',
                fields: [makeField({id: 'keep'}), makeField({id: 'new'})],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchFields()).map((f) => f.id).sort();
            expect(ids).toEqual(['keep', 'new']);
        });

        it('should treat soft-deleted incoming fields as deletions', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'gone'})], prepareRecordsOnly: false});

            await operator.handlePropertyFields({
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

            await operator.handlePropertyFields({
                groupId: 'group1',
                fields: [],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchFields()).map((f) => f.id);
            expect(ids).toEqual(['theirs']);
        });

        it('should not write to the database when prepareRecordsOnly is true', async () => {
            await operator.handlePropertyFields({fields: [makeField({id: 'stale'})], prepareRecordsOnly: false});

            const models = await operator.handlePropertyFields({
                groupId: 'group1',
                fields: [makeField({id: 'new'})],
                prepareRecordsOnly: true,
            });

            expect(models).toHaveLength(2);
            const ids = (await fetchFields()).map((f) => f.id);
            expect(ids).toEqual(['stale']);
        });
    });

    describe('=> handlePropertyValues (target sync)', () => {
        it('should upsert active values and delete stale values scoped to the target', async () => {
            await operator.handlePropertyValues({values: [
                makeValue({id: 'keep', target_id: 'target1'}),
                makeValue({id: 'stale', target_id: 'target1'}),
            ],
            prepareRecordsOnly: false});

            await operator.handlePropertyValues({
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

            await operator.handlePropertyValues({
                targetId: 'target1',
                values: [],
                prepareRecordsOnly: false,
            });

            const ids = (await fetchValues()).map((v) => v.id);
            expect(ids).toEqual(['theirs']);
        });

        it('should not write to the database when prepareRecordsOnly is true', async () => {
            await operator.handlePropertyValues({values: [makeValue({id: 'stale', target_id: 'target1'})], prepareRecordsOnly: false});

            const models = await operator.handlePropertyValues({
                targetId: 'target1',
                values: [makeValue({id: 'new', target_id: 'target1'})],
                prepareRecordsOnly: true,
            });

            expect(models).toHaveLength(2);
            const ids = (await fetchValues()).map((v) => v.id);
            expect(ids).toEqual(['stale']);
        });
    });

});
