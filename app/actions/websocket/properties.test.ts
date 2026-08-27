// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {setAccessControlGroupId} from '@actions/local/channel_attributes';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import {handlePropertyFieldCreatedOrUpdated, handlePropertyFieldDeleted, handlePropertyValuesUpdated} from './properties';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

const serverUrl = 'ws-properties.test.com';
const groupId = 'test_group';

const makeField = (id: string, overrides?: Partial<PropertyField>): PropertyField => ({
    id,
    group_id: groupId,
    name: `field_${id}`,
    type: 'select',
    object_type: 'template',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {},
    ...overrides,
});

const makeValue = (fieldId: string, value: string, overrides?: Partial<PropertyValue<string>>): PropertyValue<string> => ({
    id: `val-${fieldId}`,
    target_id: 'system',
    target_type: 'system',
    group_id: groupId,
    field_id: fieldId,
    value,
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
    ...overrides,
});

const getStoredFields = async (database: Database) => {
    const records = await database.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('group_id', groupId)).fetch();
    return records;
};

const getStoredValues = async (database: Database, targetId: string) => {
    const records = await database.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('target_id', targetId)).fetch();
    return records;
};

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePropertyFieldCreatedOrUpdated', () => {
    it('should add a field to the DB', async () => {
        const field = makeField('f1');
        const msg = {
            event: 'property_field_created',
            data: {property_field: JSON.stringify(field), object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldCreatedOrUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const fields = await getStoredFields(database);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('f1');
    });

    it('should update an existing field in the DB', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});

        const updated = makeField('f1', {name: 'updated'});
        const msg = {
            event: 'property_field_updated',
            data: {property_field: JSON.stringify(updated), object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldCreatedOrUpdated(serverUrl, msg);

        const fields = await getStoredFields(database);
        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('updated');
    });

    it('should ignore events with no property_field data', async () => {
        const msg = {
            event: 'property_field_created',
            data: {},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldCreatedOrUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should ignore events with invalid JSON', async () => {
        const msg = {
            event: 'property_field_created',
            data: {property_field: 'not-json'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldCreatedOrUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });
});

describe('handlePropertyFieldDeleted', () => {
    it('should remove a field and its values from the DB by id', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [makeField('f1'), makeField('f2')], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [makeValue('f1', 'v1')], prepareRecordsOnly: false});

        const msg = {
            event: 'property_field_deleted',
            data: {field_id: 'f1', object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldDeleted(serverUrl, msg);

        const fields = await getStoredFields(database);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('f2');
        expect(await getStoredValues(database, 'system')).toHaveLength(0);
    });

    it('should do nothing when field_id is missing', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});

        const msg = {
            event: 'property_field_deleted',
            data: {object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldDeleted(serverUrl, msg);
        expect(await getStoredFields(database)).toHaveLength(1);
    });

    it('should do nothing when field_id does not match any stored field', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});

        const msg = {
            event: 'property_field_deleted',
            data: {field_id: 'non-existent', object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyFieldDeleted(serverUrl, msg);
        expect(await getStoredFields(database)).toHaveLength(1);
    });
});

describe('handlePropertyValuesUpdated', () => {
    it('should add new values to the DB', async () => {
        const values = [makeValue('f1', 'v1'), makeValue('f2', 'v2')];
        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify(values)},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredValues(database, 'system')).toHaveLength(2);
    });

    it('should update existing values in the DB', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [makeValue('f1', 'old')], prepareRecordsOnly: false});

        const updated = [makeValue('f1', 'new')];
        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify(updated)},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const stored = await getStoredValues(database, 'system');
        expect(stored).toHaveLength(1);
        expect(stored[0].value).toBe('new');
    });

    it('should ignore events with no values', async () => {
        const msg = {
            event: 'property_values_updated',
            data: {},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredValues(database, 'system')).toHaveLength(0);
    });

    it('should ignore events with invalid JSON', async () => {
        const msg = {
            event: 'property_values_updated',
            data: {values: 'not-json'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredValues(database, 'system')).toHaveLength(0);
    });

    it('should ignore events with empty values array', async () => {
        const msg = {
            event: 'property_values_updated',
            data: {values: '[]'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredValues(database, 'system')).toHaveLength(0);
    });

    it('should store channel property values by their target_id', async () => {
        const channelId = 'channel-abc';
        const channelValue = makeValue('chan-field', 'level-1', {id: 'val-chan', target_id: channelId, target_type: 'channel'});
        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify([channelValue])},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const stored = await getStoredValues(database, channelId);
        expect(stored).toHaveLength(1);
        expect(stored[0].value).toBe('level-1');
    });

    it('should isolate values across different target ids', async () => {
        const channelId = 'channel-xyz';
        const systemVal = makeValue('sys-field', 'sys-val');
        const channelVal = makeValue('chan-field', 'chan-val', {id: 'val-chan', target_id: channelId, target_type: 'channel'});

        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify([systemVal, channelVal])},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        await handlePropertyValuesUpdated(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredValues(database, 'system')).toHaveLength(1);
        expect(await getStoredValues(database, channelId)).toHaveLength(1);
    });

    describe('pruning', () => {
        const channelId = 'channel-prune';

        // The group this feature owns, published the way the field fetch would.
        const ownedGroupId = 'access_control_group';

        const ownedValue = makeValue('owned-field', 'opt-1', {
            id: 'val-owned',
            target_id: channelId,
            target_type: 'channel',
            group_id: ownedGroupId,
        });

        // Another feature's per-channel value on the same channel. Managed channel
        // categories stores these in the same table.
        const foreignValue = makeValue('foreign-field', 'category', {
            id: 'val-foreign',
            target_id: channelId,
            target_type: 'channel',
            group_id: 'managed_channel_categories',
        });

        const clearedMessage = (data: Record<string, string>) => ({
            event: 'property_values_updated',
            data: {values: '[]', ...data},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage);

        beforeEach(async () => {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            await operator.handlePropertyValues({values: [ownedValue, foreignValue], prepareRecordsOnly: false});
            await setAccessControlGroupId(serverUrl, ownedGroupId);
        });

        it('should prune this feature\'s values when a target is cleared', async () => {
            await handlePropertyValuesUpdated(serverUrl, clearedMessage({target_id: channelId}));

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const remaining = await getStoredValues(database, channelId);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe('val-foreign');
        });

        it('should leave another property group\'s value on the same channel alone', async () => {
            await handlePropertyValuesUpdated(serverUrl, clearedMessage({target_id: channelId}));

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const foreign = await database.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('id', 'val-foreign')).fetch();
            expect(foreign).toHaveLength(1);
        });

        it('should prune nothing when the group id is not known yet', async () => {
            await setAccessControlGroupId(serverUrl, '');

            await handlePropertyValuesUpdated(serverUrl, clearedMessage({target_id: channelId}));

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(await getStoredValues(database, channelId)).toHaveLength(2);
        });

        it('should prune every value of a field when that field is cleared', async () => {
            await handlePropertyValuesUpdated(serverUrl, clearedMessage({field_id: 'owned-field'}));

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const remaining = await getStoredValues(database, channelId);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe('val-foreign');
        });

        it('should not prune when a non-empty list arrives, since it is only the changed values', async () => {
            const msg = {
                event: 'property_values_updated',
                data: {target_id: channelId, values: JSON.stringify([{...ownedValue, value: 'opt-2'}])},
                broadcast: {},
                seq: 1,
            } as WebSocketMessage;

            await handlePropertyValuesUpdated(serverUrl, msg);

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(await getStoredValues(database, channelId)).toHaveLength(2);
        });

        it('should prune nothing when an empty list carries no target or field', async () => {
            await handlePropertyValuesUpdated(serverUrl, clearedMessage({}));

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(await getStoredValues(database, channelId)).toHaveLength(2);
        });
    });
});
