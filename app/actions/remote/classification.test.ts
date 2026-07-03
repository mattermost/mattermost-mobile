// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';

import {fetchClassificationBanner, fetchChannelClassificationValue} from './classification';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

const mockedGetConfigValue = jest.mocked(getConfigValue);

const serverUrl = 'classification.test.com';

const systemField: PropertyField = {
    id: 'system-field-id',
    group_id: CLASSIFICATIONS_GROUP_NAME,
    name: 'classification',
    type: 'select',
    object_type: 'system',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {
        actions: ['display_banner_top'],
        options: [
            {id: 'opt-top-secret', name: 'TOP SECRET', color: '#FCE83A'},
            {id: 'opt-secret', name: 'SECRET', color: '#FF0000'},
        ],
    },
};

const channelField: PropertyField = {
    id: 'channel-field-id',
    group_id: CLASSIFICATIONS_GROUP_NAME,
    name: 'classification',
    type: 'select',
    object_type: 'channel',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {
        options: [
            {id: 'opt-top-secret', name: 'TOP SECRET', color: '#FCE83A'},
            {id: 'opt-secret', name: 'SECRET', color: '#FF0000'},
        ],
    },
};

const systemValue: PropertyValue<string> = {
    id: 'val-1',
    target_id: 'system',
    target_type: 'system',
    group_id: CLASSIFICATIONS_GROUP_NAME,
    field_id: 'system-field-id',
    value: 'opt-top-secret',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

const mockClient = {
    getPropertyFields: jest.fn(),
    getSystemPropertyValues: jest.fn(),
    getPropertyValues: jest.fn(),
};

const queryFieldsByGroup = (database: Database, groupId: string) =>
    database.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('group_id', groupId)).fetch();

const getStoredFields = async (database: Database) => {
    const records = await queryFieldsByGroup(database, CLASSIFICATIONS_GROUP_NAME);
    return records.map((r) => r.id).sort();
};

const getStoredValues = async (database: Database, targetId: string) => {
    const records = await database.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('target_id', targetId)).fetch();
    return records;
};

beforeAll(() => {
    // @ts-expect-error mock client
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    jest.clearAllMocks();
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('fetchClassificationBanner', () => {
    it('should do nothing when feature flag is not true', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('false');

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should clear stale classification data when feature flag is turned off', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

        mockedGetConfigValue.mockResolvedValueOnce('false');
        await fetchClassificationBanner(serverUrl);

        expect(await getStoredFields(database)).toHaveLength(0);
        expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(0);
    });

    it('should clear stale classification data when API returns zero fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        await fetchClassificationBanner(serverUrl);

        expect(await getStoredFields(database)).toHaveLength(0);
        expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(0);
    });

    it('should persist fields and values to DB on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toEqual(['channel-field-id', 'system-field-id']);
        const values = await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID);
        expect(values).toHaveLength(1);
        expect(values[0].value).toBe('opt-top-secret');
    });

    it('should persist system field when channel field is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toEqual(['system-field-id']);
    });

    it('should return early when no fields are returned by the API', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should exclude soft-deleted fields from the stored set', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const deletedSystem = {...systemField, delete_at: 5000};
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedSystem]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toEqual(['channel-field-id']);
    });

    it('should return early when fields have mismatched group_ids', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const differentGroupField = {...channelField, group_id: 'other_group'};
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([differentGroupField]);

        const result = await fetchClassificationBanner(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should return error when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyFields.mockRejectedValueOnce(networkError);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({error: networkError});
    });

    it('should not write to DB when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockRejectedValueOnce(new Error('network failure'));

        await fetchClassificationBanner(serverUrl);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should remove a previously persisted field the API no longer returns', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField, channelField], prepareRecordsOnly: false});

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchClassificationBanner(serverUrl);

        expect(await getStoredFields(database)).toEqual(['system-field-id']);
    });

    it('should remove soft-deleted fields from DB even when they were previously persisted', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField, channelField], prepareRecordsOnly: false});

        const deletedChannel = {...channelField, delete_at: 5000};
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedChannel]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        await fetchClassificationBanner(serverUrl);

        expect(await getStoredFields(database)).toEqual(['system-field-id']);
    });

    it('should leave fields from other groups untouched', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const otherGroupField = {...systemField, id: 'other-field', group_id: 'other_group', name: 'some_field'};
        await operator.handlePropertyFields({fields: [otherGroupField], prepareRecordsOnly: false});

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchClassificationBanner(serverUrl);

        expect(await getStoredFields(database)).toEqual(['system-field-id']);
        const otherGroup = await queryFieldsByGroup(database, 'other_group');
        expect(otherGroup.map((f) => f.id)).toEqual(['other-field']);
    });
});

describe('fetchChannelClassificationValue', () => {
    const channelId = 'channel-123';

    const channelValue: PropertyValue<string> = {
        id: 'cv-1',
        target_id: channelId,
        target_type: 'channel',
        group_id: CLASSIFICATIONS_GROUP_NAME,
        field_id: 'channel-field-id',
        value: 'opt-secret',
        create_at: 1000,
        update_at: 1000,
        delete_at: 0,
    };

    it('should do nothing when feature flag is not true', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('false');

        const result = await fetchChannelClassificationValue(serverUrl, channelId);

        expect(result).toEqual({});
        expect(mockClient.getPropertyValues).not.toHaveBeenCalled();
    });

    it('should persist channel values to DB on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const values = await getStoredValues(database, channelId);
        expect(values).toHaveLength(1);
        expect(values[0].value).toBe('opt-secret');
    });

    it('should clear existing channel values when API returns none', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [channelValue], prepareRecordsOnly: false});

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);
        expect(result).toEqual({});

        expect(await getStoredValues(database, channelId)).toHaveLength(0);
    });

    it('should return error when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyValues.mockRejectedValueOnce(networkError);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);
        expect(result).toEqual({error: networkError});
    });

    it('should isolate values across different targets', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);

        await fetchChannelClassificationValue(serverUrl, channelId);

        expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(1);
        expect(await getStoredValues(database, channelId)).toHaveLength(1);
    });
});
