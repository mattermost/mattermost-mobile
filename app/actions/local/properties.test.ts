// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    getGroupIdByName,
    getPropertyFields,
    getPropertyValuesForTarget,
    registerGroupName,
    setPropertyFields,
    setPropertyValues,
} from '@store/system_property_store';

import {hydratePropertyStore, persistPropertyStoreSnapshot} from './properties';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

const serverUrl = 'properties.local.test.com';
const groupId = 'group1';
const targetId = 'system';

const makeField = (id: string): PropertyField => ({
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
});

const makeValue = (fieldId: string, value: string): PropertyValue<string> => ({
    id: `val-${fieldId}`,
    target_id: targetId,
    target_type: 'system',
    group_id: groupId,
    field_id: fieldId,
    value,
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
});

let database: Database;
let operator: ServerDataOperator;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    database = db.database;
    operator = db.operator;

    setPropertyFields(serverUrl, groupId, []);
    setPropertyValues(serverUrl, targetId, groupId, []);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('persistPropertyStoreSnapshot', () => {
    it('should write all three System records in one batch', async () => {
        setPropertyFields(serverUrl, groupId, [makeField('f1'), makeField('f2')]);
        setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'v1')]);
        registerGroupName(serverUrl, 'classification_markings', groupId);

        await persistPropertyStoreSnapshot(serverUrl);

        const {MM_TABLES} = require('@constants/database');
        const {SERVER: {SYSTEM}} = MM_TABLES;

        const fieldsRecord = await database.get(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_FIELDS) as any;
        const valuesRecord = await database.get(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_VALUES) as any;
        const groupNamesRecord = await database.get(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES) as any;

        expect(fieldsRecord.value[groupId]).toHaveLength(2);
        expect(valuesRecord.value[targetId]).toHaveLength(1);
        expect(groupNamesRecord.value.classification_markings).toBe(groupId);
    });

    it('should persist empty groups when no fields have been added', async () => {
        // beforeEach calls setPropertyFields(serverUrl, groupId, []) which creates an empty group
        await persistPropertyStoreSnapshot(serverUrl);

        const {MM_TABLES} = require('@constants/database');
        const {SERVER: {SYSTEM}} = MM_TABLES;

        const fieldsRecord = await database.get(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_FIELDS) as any;
        expect(fieldsRecord.value[groupId]).toEqual([]);
    });

    it('should handle missing database gracefully without throwing', async () => {
        await expect(persistPropertyStoreSnapshot('https://unknown.server.com')).resolves.not.toThrow();
    });

    it('should overwrite existing persisted data on subsequent calls', async () => {
        setPropertyFields(serverUrl, groupId, [makeField('f1')]);
        await persistPropertyStoreSnapshot(serverUrl);

        setPropertyFields(serverUrl, groupId, [makeField('f1'), makeField('f2')]);
        await persistPropertyStoreSnapshot(serverUrl);

        const {MM_TABLES} = require('@constants/database');
        const {SERVER: {SYSTEM}} = MM_TABLES;
        const fieldsRecord = await database.get(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_FIELDS) as any;
        expect(fieldsRecord.value[groupId]).toHaveLength(2);
    });
});

describe('hydratePropertyStore', () => {
    it('should populate the store from persisted DB data', async () => {
        const fields: Record<string, PropertyField[]> = {[groupId]: [makeField('f1')]};
        const values: Record<string, Array<PropertyValue<string>>> = {[targetId]: [makeValue('f1', 'v1')]};
        const groupNames = {classification_markings: groupId};

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: fields},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: values},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: groupNames},
            ],
            prepareRecordsOnly: false,
        });

        await hydratePropertyStore(serverUrl);

        expect(getPropertyFields(serverUrl, groupId)).toHaveLength(1);
        expect(getPropertyFields(serverUrl, groupId)[0].id).toBe('f1');
        expect(getPropertyValuesForTarget(serverUrl, targetId)).toHaveLength(1);
        expect(getPropertyValuesForTarget(serverUrl, targetId)[0].value).toBe('v1');
        expect(getGroupIdByName(serverUrl, 'classification_markings')).toBe(groupId);
    });

    it('should hydrate with empty values and group names when only fields are stored', async () => {
        const fields: Record<string, PropertyField[]> = {[groupId]: [makeField('f1')]};
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: fields},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: {}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: {}},
            ],
            prepareRecordsOnly: false,
        });

        await expect(hydratePropertyStore(serverUrl)).resolves.not.toThrow();
        expect(getPropertyFields(serverUrl, groupId)).toHaveLength(1);
    });

    it('should preserve in-memory data when DB has no persisted records', async () => {
        setPropertyFields(serverUrl, groupId, [makeField('fresh')]);

        await hydratePropertyStore(serverUrl);

        expect(getPropertyFields(serverUrl, groupId)).toHaveLength(1);
        expect(getPropertyFields(serverUrl, groupId)[0].id).toBe('fresh');
    });

    it('should handle missing database gracefully without throwing', async () => {
        await expect(hydratePropertyStore('https://unknown.server.com')).resolves.not.toThrow();
    });
});
