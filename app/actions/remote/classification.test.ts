// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CLASSIFICATIONS_GROUP_NAME} from '@constants/classification';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getPersistedPropertyFields, getPersistedPropertyGroupNames, getPersistedPropertyValues} from '@queries/servers/properties';
import {getConfigValue} from '@queries/servers/system';

import {fetchClassificationBanner, fetchChannelClassificationValue} from './classification';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

const mockedGetConfigValue = jest.mocked(getConfigValue);

const serverUrl = 'classification.test.com';

const systemField: PropertyField = {
    id: 'system-field-id',
    group_id: CLASSIFICATIONS_GROUP_NAME,
    name: 'system_classification',
    type: 'select',
    object_type: 'system',
    target_type: 'system',
    target_id: '',
    linked_field_id: 'template-field-id',
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
    name: 'channel_classification',
    type: 'select',
    object_type: 'channel',
    target_type: 'system',
    target_id: '',
    linked_field_id: 'template-field-id',
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
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: {[CLASSIFICATIONS_GROUP_NAME]: [systemField]}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: {system: [systemValue]}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: {[CLASSIFICATIONS_GROUP_NAME]: CLASSIFICATIONS_GROUP_NAME}},
            ],
            prepareRecordsOnly: false,
        });

        mockedGetConfigValue.mockResolvedValueOnce('false');
        await fetchClassificationBanner(serverUrl);

        const fields = await getPersistedPropertyFields(database);
        const values = await getPersistedPropertyValues(database);
        const groupNames = await getPersistedPropertyGroupNames(database);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toBeUndefined();
        expect(values.system).toBeUndefined();
        expect(groupNames[CLASSIFICATIONS_GROUP_NAME]).toBeUndefined();
    });

    it('should clear stale classification data when API returns zero fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: {[CLASSIFICATIONS_GROUP_NAME]: [systemField]}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: {system: [systemValue]}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: {[CLASSIFICATIONS_GROUP_NAME]: CLASSIFICATIONS_GROUP_NAME}},
            ],
            prepareRecordsOnly: false,
        });

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        await fetchClassificationBanner(serverUrl);

        const fields = await getPersistedPropertyFields(database);
        const values = await getPersistedPropertyValues(database);
        const groupNames = await getPersistedPropertyGroupNames(database);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toBeUndefined();
        expect(values.system).toBeUndefined();
        expect(groupNames[CLASSIFICATIONS_GROUP_NAME]).toBeUndefined();
    });

    it('should persist fields and values to DB on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const fields = await getPersistedPropertyFields(database);
        const values = await getPersistedPropertyValues(database);
        const groupNames = await getPersistedPropertyGroupNames(database);

        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toHaveLength(2);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toEqual(expect.arrayContaining([systemField, channelField]));
        expect(values.system).toEqual([systemValue]);
        expect(groupNames[CLASSIFICATIONS_GROUP_NAME]).toBe(CLASSIFICATIONS_GROUP_NAME);
    });

    it('should persist system field when channel field is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const fields = await getPersistedPropertyFields(database);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toEqual([systemField]);
    });

    it('should return early when no fields are returned by the API', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const fields = await getPersistedPropertyFields(database);
        expect(Object.keys(fields)).toHaveLength(0);
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
        const fields = await getPersistedPropertyFields(database);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toEqual([channelField]);
    });

    it('should return early when fields have mismatched group_ids', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const differentGroupField = {...channelField, group_id: 'other_group'};
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([differentGroupField]);

        const result = await fetchClassificationBanner(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const fields = await getPersistedPropertyFields(database);
        expect(Object.keys(fields)).toHaveLength(0);
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
        const fields = await getPersistedPropertyFields(database);
        expect(Object.keys(fields)).toHaveLength(0);
    });

    it('should preserve WS-received channel field when API only returns system fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: {[CLASSIFICATIONS_GROUP_NAME]: [channelField]}},
            ],
            prepareRecordsOnly: false,
        });

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchClassificationBanner(serverUrl);

        const fields = await getPersistedPropertyFields(database);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toHaveLength(2);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toEqual(expect.arrayContaining([systemField, channelField]));
    });

    it('should remove soft-deleted fields from DB even when they were previously persisted', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: {[CLASSIFICATIONS_GROUP_NAME]: [systemField, channelField]}},
            ],
            prepareRecordsOnly: false,
        });

        const deletedChannel = {...channelField, delete_at: 5000};
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedChannel]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        await fetchClassificationBanner(serverUrl);

        const fields = await getPersistedPropertyFields(database);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toEqual([systemField]);
    });

    it('should merge with existing DB data on subsequent calls', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: {existing_group: [{id: 'existing-field'}]}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: {}},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: {existing: 'existing_group'}},
            ],
            prepareRecordsOnly: false,
        });

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchClassificationBanner(serverUrl);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const fields = await getPersistedPropertyFields(database);
        const groupNames = await getPersistedPropertyGroupNames(database);

        expect(fields.existing_group).toEqual([{id: 'existing-field'}]);
        expect(fields[CLASSIFICATIONS_GROUP_NAME]).toEqual([systemField]);
        expect(groupNames.existing).toBe('existing_group');
        expect(groupNames[CLASSIFICATIONS_GROUP_NAME]).toBe(CLASSIFICATIONS_GROUP_NAME);
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
        const values = await getPersistedPropertyValues(database);
        expect(values[channelId]).toEqual([channelValue]);
    });

    it('should return early when API returns no values', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);
        expect(result).toEqual({});
    });

    it('should return early when group_id is empty', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const noGroupValue = {...channelValue, group_id: ''};
        mockClient.getPropertyValues.mockResolvedValueOnce([noGroupValue]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);
        expect(result).toEqual({});
    });

    it('should return error when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyValues.mockRejectedValueOnce(networkError);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);
        expect(result).toEqual({error: networkError});
    });

    it('should merge with existing DB values on subsequent calls', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: {system: [systemValue]}},
            ],
            prepareRecordsOnly: false,
        });

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);

        await fetchChannelClassificationValue(serverUrl, channelId);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const values = await getPersistedPropertyValues(database);
        expect(values.system).toEqual([systemValue]);
        expect(values[channelId]).toEqual([channelValue]);
    });
});
