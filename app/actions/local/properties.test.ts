// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CLASSIFICATIONS_CHANNEL_FIELD_NAME, CLASSIFICATIONS_SYSTEM_FIELD_NAME} from '@constants/classification';
import DatabaseManager from '@database/manager';
import {queryPropertyFieldsByGroupId, queryPropertyValuesByTargetId} from '@queries/servers/properties';

import {clearClassificationData, syncPropertyFieldsByGroupId, syncPropertyValuesByTargetId} from './properties';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn(),
}));

const serverUrl = 'local.properties.test.com';
const groupId = 'group-1';
const otherGroupId = 'group-2';
const systemTarget = 'system';

let database: Database;
let operator: ServerDataOperator;

const makeField = (id: string, overrides?: Partial<PropertyField>): PropertyField => ({
    id,
    group_id: groupId,
    name: `field_${id}`,
    type: 'select',
    object_type: 'system',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {},
    ...overrides,
});

const makeValue = (id: string, overrides?: Partial<PropertyValue<string>>): PropertyValue<string> => ({
    id,
    target_id: systemTarget,
    target_type: 'system',
    group_id: groupId,
    field_id: 'field-1',
    value: `value_${id}`,
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
    ...overrides,
});

const seedFields = (fields: PropertyField[]) => operator.handlePropertyFields({fields, prepareRecordsOnly: false});
const seedValues = (values: Array<PropertyValue<string>>) => operator.handlePropertyValues({values, prepareRecordsOnly: false});

const storedFieldIds = async (gId: string) => {
    const records = await queryPropertyFieldsByGroupId(database, gId).fetch();
    return records.map((r) => r.id).sort();
};

const storedValueIds = async (targetId: string) => {
    const records = await queryPropertyValuesByTargetId(database, targetId).fetch();
    return records.map((r) => r.id).sort();
};

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    database = db.database;
    operator = db.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('syncPropertyFieldsByGroupId', () => {
    it('should upsert active fields and return the persisted models', async () => {
        const result = await syncPropertyFieldsByGroupId(serverUrl, groupId, [makeField('f1'), makeField('f2')]);

        expect('models' in result && result.models).toHaveLength(2);
        expect(await storedFieldIds(groupId)).toEqual(['f1', 'f2']);
    });

    it('should remove fields in the group that are no longer present', async () => {
        await seedFields([makeField('f1'), makeField('f2')]);

        await syncPropertyFieldsByGroupId(serverUrl, groupId, [makeField('f1')]);

        expect(await storedFieldIds(groupId)).toEqual(['f1']);
    });

    it('should exclude soft-deleted incoming fields and remove them if already persisted', async () => {
        await seedFields([makeField('f1'), makeField('f2')]);

        await syncPropertyFieldsByGroupId(serverUrl, groupId, [makeField('f1'), makeField('f2', {delete_at: 5000})]);

        expect(await storedFieldIds(groupId)).toEqual(['f1']);
    });

    it('should not touch fields belonging to other groups', async () => {
        await seedFields([makeField('other', {group_id: otherGroupId})]);

        await syncPropertyFieldsByGroupId(serverUrl, groupId, [makeField('f1')]);

        expect(await storedFieldIds(groupId)).toEqual(['f1']);
        expect(await storedFieldIds(otherGroupId)).toEqual(['other']);
    });

    it('should not write when prepareRecordsOnly is true but still return prepared models', async () => {
        const result = await syncPropertyFieldsByGroupId(serverUrl, groupId, [makeField('f1')], true);

        expect('models' in result && result.models).toHaveLength(1);
        expect(await storedFieldIds(groupId)).toEqual([]);
    });

    it('should return an error when the server database is unavailable', async () => {
        const result = await syncPropertyFieldsByGroupId('unknown.server.com', groupId, [makeField('f1')]);

        expect('error' in result).toBe(true);
    });
});

describe('syncPropertyValuesByTargetId', () => {
    it('should upsert active values and return the persisted models', async () => {
        const result = await syncPropertyValuesByTargetId(serverUrl, systemTarget, [makeValue('v1'), makeValue('v2')]);

        expect('models' in result && result.models).toHaveLength(2);
        expect(await storedValueIds(systemTarget)).toEqual(['v1', 'v2']);
    });

    it('should remove values for the target that are no longer present', async () => {
        await seedValues([makeValue('v1'), makeValue('v2')]);

        await syncPropertyValuesByTargetId(serverUrl, systemTarget, [makeValue('v1')]);

        expect(await storedValueIds(systemTarget)).toEqual(['v1']);
    });

    it('should clear existing values when an empty array is provided', async () => {
        await seedValues([makeValue('v1')]);

        await syncPropertyValuesByTargetId(serverUrl, systemTarget, []);

        expect(await storedValueIds(systemTarget)).toEqual([]);
    });

    it('should not touch values for other targets', async () => {
        const channelTarget = 'channel-1';
        await seedValues([makeValue('cv1', {target_id: channelTarget, target_type: 'channel'})]);

        await syncPropertyValuesByTargetId(serverUrl, systemTarget, [makeValue('v1')]);

        expect(await storedValueIds(systemTarget)).toEqual(['v1']);
        expect(await storedValueIds(channelTarget)).toEqual(['cv1']);
    });

    it('should not write when prepareRecordsOnly is true', async () => {
        const result = await syncPropertyValuesByTargetId(serverUrl, systemTarget, [makeValue('v1')], true);

        expect('models' in result && result.models).toHaveLength(1);
        expect(await storedValueIds(systemTarget)).toEqual([]);
    });
});

describe('clearClassificationData', () => {
    it('should destroy classification fields and their values', async () => {
        const classificationField = makeField('sys', {name: CLASSIFICATIONS_SYSTEM_FIELD_NAME});
        await seedFields([classificationField]);
        await seedValues([makeValue('cv', {field_id: 'sys'})]);

        await clearClassificationData(serverUrl);

        expect(await storedFieldIds(groupId)).toEqual([]);
        expect(await storedValueIds(systemTarget)).toEqual([]);
    });

    it('should leave non-classification fields and their values untouched', async () => {
        await seedFields([
            makeField('sys', {name: CLASSIFICATIONS_SYSTEM_FIELD_NAME}),
            makeField('other', {name: 'unrelated_field'}),
        ]);
        await seedValues([
            makeValue('cv', {field_id: 'sys'}),
            makeValue('ov', {field_id: 'other'}),
        ]);

        await clearClassificationData(serverUrl);

        expect(await storedFieldIds(groupId)).toEqual(['other']);
        expect(await storedValueIds(systemTarget)).toEqual(['ov']);
    });

    it('should not write when prepareRecordsOnly is true', async () => {
        await seedFields([makeField('sys', {name: CLASSIFICATIONS_CHANNEL_FIELD_NAME})]);

        const result = await clearClassificationData(serverUrl, true);

        expect('models' in result && result.models).toHaveLength(1);
        expect(await storedFieldIds(groupId)).toEqual(['sys']);
    });

    it('should return empty models when there is nothing to clear', async () => {
        const result = await clearClassificationData(serverUrl);

        expect('models' in result && result.models).toHaveLength(0);
    });
});
