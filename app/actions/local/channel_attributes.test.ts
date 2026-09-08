// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CHANNEL_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
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
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('removeStoredFields', () => {
    it('should clean non-classification access-control fields when group ID is not stored', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Seed a channel-attribute field (not classification) without setting the System group ID.
        await operator.handlePropertyFields({fields: [makeField('ca-field')], prepareRecordsOnly: false});

        // System table has no ACCESS_CONTROL_GROUP_ID stored.
        await removeStoredFields(serverUrl);

        // Operator permanently destroys the record, so it must no longer appear in queries.
        const fields = await getFields(database);
        expect(fields.find((f) => f.id === 'ca-field')).toBeUndefined();
    });

    it('should clean associated values for stale fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [makeValue('v1', 'f1')], prepareRecordsOnly: false});

        await setAccessControlGroupId(serverUrl, accessControlGroupId);
        await removeStoredFields(serverUrl);

        // The operator cascades value deletion when fields are destroyed.
        const values = await getValues(database);
        expect(values.find((v) => v.id === 'v1')).toBeUndefined();
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

        // Foreign-group field must survive.
        expect(fields.find((f) => f.id === 'foreign')).toBeDefined();

        // Owned field must be gone.
        expect(fields.find((f) => f.id === 'owned')).toBeUndefined();
    });

    it('should propagate error when clearing group ID fails', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        await operator.handlePropertyFields({fields: [makeField('f1')], prepareRecordsOnly: false});
        await setAccessControlGroupId(serverUrl, accessControlGroupId);

        // The second DatabaseManager call is inside setAccessControlGroupId.
        // Make it throw so removeStoredFields receives {error} and re-throws.
        const real = DatabaseManager.getServerDatabaseAndOperator.bind(DatabaseManager);
        let callCount = 0;
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementation((url) => {
            callCount++;
            if (callCount === 2) {
                throw new Error('db write error');
            }
            return real(url);
        });

        await expect(removeStoredFields(serverUrl)).rejects.toThrow('db write error');

        jest.restoreAllMocks();
    });
});
