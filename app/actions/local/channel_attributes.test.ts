// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CHANNEL_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import {CLASSIFICATIONS_FIELD_NAME, CLASSIFICATIONS_SYSTEM_OBJECT_TYPE} from '@constants/classification';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import {removeStoredFields, setAccessControlGroupId} from './channel_attributes';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';
import type {Database} from '@nozbe/watermelondb';

const {SERVER: {PROPERTY_FIELD, PROPERTY_VALUE}} = MM_TABLES;

const serverUrl = 'channel-attributes.test.com';
const accessControlGroupId = 'ac-group-id';
const otherGroupId = 'other-group-id';

const makeField = (id: string, overrides?: Partial<PropertyField>): PropertyField => ({
    id,
    group_id: accessControlGroupId,
    name: `field_${id}`,
    type: 'select',
    object_type: CHANNEL_ATTRIBUTE_OBJECT_TYPE,
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {},
    ...overrides,
});

const makeValue = (id: string, fieldId: string, overrides?: Partial<PropertyValue<string>>): PropertyValue<string> => ({
    id,
    target_id: 'ch1',
    target_type: 'channel',
    group_id: accessControlGroupId,
    field_id: fieldId,
    value: 'v',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
    ...overrides,
});

const getFields = (database: Database) => database.get<PropertyFieldModel>(PROPERTY_FIELD).query().fetch();
const getValues = (database: Database) => database.get<PropertyValueModel>(PROPERTY_VALUE).query().fetch();

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    jest.restoreAllMocks();
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('removeStoredFields', () => {
    it('should recover the group ID from classification and clean all owned fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({
            fields: [
                makeField('cls-field', {name: CLASSIFICATIONS_FIELD_NAME, object_type: CLASSIFICATIONS_SYSTEM_OBJECT_TYPE}),
                makeField('ca-field', {name: 'region', object_type: CHANNEL_ATTRIBUTE_OBJECT_TYPE}),
                makeField('foreign', {group_id: otherGroupId, object_type: CHANNEL_ATTRIBUTE_OBJECT_TYPE}),
            ],
            prepareRecordsOnly: false,
        });

        await removeStoredFields(serverUrl);

        const fields = await getFields(database);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('foreign');
    });

    it('should leave fields untouched when the group ID cannot be identified safely', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({
            fields: [
                makeField('ca-field'),
                makeField('foreign', {group_id: otherGroupId}),
            ],
            prepareRecordsOnly: false,
        });

        await removeStoredFields(serverUrl);

        const fields = await getFields(database);
        expect(fields).toHaveLength(2);
        expect(fields.map((field) => field.id).sort()).toEqual(['ca-field', 'foreign']);
    });

    it('should fail closed when classification fields identify multiple groups', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({
            fields: [
                makeField('owned-classification', {name: CLASSIFICATIONS_FIELD_NAME}),
                makeField('other-classification', {group_id: otherGroupId, name: CLASSIFICATIONS_FIELD_NAME}),
            ],
            prepareRecordsOnly: false,
        });

        await removeStoredFields(serverUrl);

        const fields = await getFields(database);
        expect(fields).toHaveLength(2);
    });

    it('should clean all owned fields by group when group ID is stored', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({
            fields: [
                makeField('cls-field', {name: CLASSIFICATIONS_FIELD_NAME, object_type: CLASSIFICATIONS_SYSTEM_OBJECT_TYPE}),
                makeField('ca-field', {name: 'region', object_type: CHANNEL_ATTRIBUTE_OBJECT_TYPE}),
            ],
            prepareRecordsOnly: false,
        });

        await setAccessControlGroupId(serverUrl, accessControlGroupId);
        await removeStoredFields(serverUrl);

        const fields = await getFields(database);
        expect(fields).toHaveLength(0);
    });

    it('should clean associated values for stale fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [makeValue('v1', 'f1')], prepareRecordsOnly: false});

        await setAccessControlGroupId(serverUrl, accessControlGroupId);
        await removeStoredFields(serverUrl);

        const values = await getValues(database);
        expect(values).toHaveLength(0);
    });

    it('should not touch fields from another group', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({
            fields: [
                makeField('owned', {group_id: accessControlGroupId}),
                makeField('foreign', {group_id: otherGroupId}),
            ],
            prepareRecordsOnly: false,
        });

        await setAccessControlGroupId(serverUrl, accessControlGroupId);
        await removeStoredFields(serverUrl);

        const fields = await getFields(database);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('foreign');
    });

    it('should propagate error and leave the field untouched when the batch write fails', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});

        jest.spyOn(operator.database, 'write').mockRejectedValueOnce(new Error('db write error'));

        await expect(removeStoredFields(serverUrl)).rejects.toThrow('db write error');

        // The field deletion and the group-id clear are one batch: a failed write
        // must leave the owned field exactly as it was.
        const fields = await getFields(database);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('f1');
    });
});
