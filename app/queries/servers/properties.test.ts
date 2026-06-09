// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {
    getPersistedPropertyFields,
    getPersistedPropertyGroupNames,
    getPersistedPropertyValues,
} from './properties';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'properties.query.test.com';
let database: Database;
let operator: ServerDataOperator;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    database = db.database;
    operator = db.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('getPersistedPropertyFields', () => {
    it('should return empty object when no record exists', async () => {
        const result = await getPersistedPropertyFields(database);
        expect(result).toEqual({});
    });

    it('should return stored fields grouped by groupId', async () => {
        const fields: Record<string, PropertyField[]> = {
            group1: [{
                id: 'f1',
                group_id: 'group1',
                name: 'field_1',
                type: 'select',
                object_type: 'system',
                target_type: 'system',
                target_id: '',
                delete_at: 0,
                create_at: 1000,
                update_at: 1000,
            }],
        };
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: fields}],
            prepareRecordsOnly: false,
        });

        const result = await getPersistedPropertyFields(database);
        expect(result).toEqual(fields);
    });

    it('should return empty object when value is null', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: null}],
            prepareRecordsOnly: false,
        });

        const result = await getPersistedPropertyFields(database);
        expect(result).toEqual({});
    });
});

describe('getPersistedPropertyValues', () => {
    it('should return empty object when no record exists', async () => {
        const result = await getPersistedPropertyValues(database);
        expect(result).toEqual({});
    });

    it('should return stored values grouped by targetId', async () => {
        const values: Record<string, Array<PropertyValue<string>>> = {
            system: [{
                id: 'v1',
                target_id: 'system',
                target_type: 'system',
                group_id: 'group1',
                field_id: 'f1',
                value: 'opt-1',
                create_at: 1000,
                update_at: 1000,
                delete_at: 0,
            }],
        };
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: values}],
            prepareRecordsOnly: false,
        });

        const result = await getPersistedPropertyValues(database);
        expect(result).toEqual(values);
    });

    it('should return empty object when value is null', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: null}],
            prepareRecordsOnly: false,
        });

        const result = await getPersistedPropertyValues(database);
        expect(result).toEqual({});
    });
});

describe('getPersistedPropertyGroupNames', () => {
    it('should return empty object when no record exists', async () => {
        const result = await getPersistedPropertyGroupNames(database);
        expect(result).toEqual({});
    });

    it('should return stored group name mapping', async () => {
        const groupNames = {access_control: 'group-uuid-1'};
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: groupNames}],
            prepareRecordsOnly: false,
        });

        const result = await getPersistedPropertyGroupNames(database);
        expect(result).toEqual(groupNames);
    });

    it('should return empty object when value is null', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: null}],
            prepareRecordsOnly: false,
        });

        const result = await getPersistedPropertyGroupNames(database);
        expect(result).toEqual({});
    });
});
