// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';

import {fetchAccessControlAttributeFields, fetchChannelAttributeValues} from './classification';

import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

const mockedGetConfigValue = jest.mocked(getConfigValue);

// Keyed rather than ordered. The action reads two feature flags and the server
// version, and an ordered queue of one-shot values silently mis-answers the
// moment the number or order of reads changes.
type TestConfig = Partial<Record<'FeatureFlagClassificationMarkings' | 'FeatureFlagChannelAttributes' | 'Version', string>>;

const setConfig = (config: TestConfig) => {
    mockedGetConfigValue.mockImplementation((_database, key) => Promise.resolve(config[key as keyof TestConfig]));
};

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
    searchPropertyFields: jest.fn(),
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
    setConfig({});
    EphemeralStore.clearClassificationCache(serverUrl);
    EphemeralStore.clearChannelAttributeValuesSynced(serverUrl);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('fetchAccessControlAttributeFields', () => {
    it('should do nothing when feature flag is not true', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'false'});

        const result = await fetchAccessControlAttributeFields(serverUrl);

        expect(result).toEqual({});
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should clear stale classification data when feature flag is turned off', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'false'});
        await fetchAccessControlAttributeFields(serverUrl);

        expect(await getStoredFields(database)).toHaveLength(0);
        expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(0);
    });

    it('should clear stale classification data when API returns zero fields', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField], prepareRecordsOnly: false});
        await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        await fetchAccessControlAttributeFields(serverUrl);

        expect(await getStoredFields(database)).toHaveLength(0);
        expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(0);
    });

    it('should persist fields and values to DB on happy path', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchAccessControlAttributeFields(serverUrl);

        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toEqual(['channel-field-id', 'system-field-id']);
        const values = await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID);
        expect(values).toHaveLength(1);
        expect(values[0].value).toBe('opt-top-secret');
    });

    it('should persist system field when channel field is missing', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchAccessControlAttributeFields(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toEqual(['system-field-id']);
    });

    it('should return early when no fields are returned by the API', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchAccessControlAttributeFields(serverUrl);

        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should exclude soft-deleted fields from the stored set', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        const deletedSystem = {...systemField, delete_at: 5000};
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedSystem]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchAccessControlAttributeFields(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toEqual(['channel-field-id']);
    });

    it('should return early when fields have mismatched group_ids', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        const differentGroupField = {...channelField, group_id: 'other_group'};
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([differentGroupField]);

        const result = await fetchAccessControlAttributeFields(serverUrl);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should return error when network client throws', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        const networkError = new Error('network failure');
        mockClient.getPropertyFields.mockRejectedValueOnce(networkError);

        const result = await fetchAccessControlAttributeFields(serverUrl);

        expect(result).toEqual({error: networkError});
    });

    it('should not write to DB when network client throws', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockRejectedValueOnce(new Error('network failure'));

        await fetchAccessControlAttributeFields(serverUrl);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        expect(await getStoredFields(database)).toHaveLength(0);
    });

    it('should remove a previously persisted field the API no longer returns', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField, channelField], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchAccessControlAttributeFields(serverUrl);

        expect(await getStoredFields(database)).toEqual(['system-field-id']);
    });

    it('should remove soft-deleted fields from DB even when they were previously persisted', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [systemField, channelField], prepareRecordsOnly: false});

        const deletedChannel = {...channelField, delete_at: 5000};
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedChannel]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        await fetchAccessControlAttributeFields(serverUrl);

        expect(await getStoredFields(database)).toEqual(['system-field-id']);
    });

    it('should leave fields from other groups untouched', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const otherGroupField = {...systemField, id: 'other-field', group_id: 'other_group', name: 'some_field'};
        await operator.handlePropertyFields({fields: [otherGroupField], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchAccessControlAttributeFields(serverUrl);

        expect(await getStoredFields(database)).toEqual(['system-field-id']);
        const otherGroup = await queryFieldsByGroup(database, 'other_group');
        expect(otherGroup.map((f) => f.id)).toEqual(['other-field']);
    });

    it('should skip the request when cached and not forced', async () => {
        EphemeralStore.setClassificationBannerFetched(serverUrl);

        const result = await fetchAccessControlAttributeFields(serverUrl);

        expect(result).toEqual({});
        expect(mockedGetConfigValue).not.toHaveBeenCalled();
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
        expect(mockClient.searchPropertyFields).not.toHaveBeenCalled();
    });

    it('should bypass the cache when forced', async () => {
        EphemeralStore.setClassificationBannerFetched(serverUrl);
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchAccessControlAttributeFields(serverUrl, true);

        expect(mockClient.getPropertyFields).toHaveBeenCalled();
    });

    it('should cache on success so a subsequent unforced call is skipped', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchAccessControlAttributeFields(serverUrl);
        await fetchAccessControlAttributeFields(serverUrl);

        // Two requests on the first call (system and channel fields); the second
        // call is answered from the cache without touching the network.
        expect(mockClient.getPropertyFields).toHaveBeenCalledTimes(2);
    });

    it('should not cache on error so a subsequent unforced call retries', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyFields.mockRejectedValueOnce(new Error('network failure'));

        await fetchAccessControlAttributeFields(serverUrl);

        // The failure must not have stamped the cache, so an unforced retry runs.
        setConfig({FeatureFlagClassificationMarkings: 'false'});
        await fetchAccessControlAttributeFields(serverUrl);

        expect(mockedGetConfigValue).toHaveBeenCalledWith(expect.anything(), 'FeatureFlagClassificationMarkings');
        expect(mockedGetConfigValue).toHaveBeenCalledWith(expect.anything(), 'FeatureFlagChannelAttributes');
    });

    describe('when the server supports the fields search endpoint', () => {
        it('should fetch all fields with a single search request', async () => {
            setConfig({FeatureFlagClassificationMarkings: 'true', Version: '11.10.0'});
            mockClient.searchPropertyFields.mockResolvedValueOnce([systemField, channelField]);
            mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

            const result = await fetchAccessControlAttributeFields(serverUrl);

            expect(result).toEqual({});
            expect(mockClient.searchPropertyFields).toHaveBeenCalledTimes(1);
            expect(mockClient.searchPropertyFields).toHaveBeenCalledWith(CLASSIFICATIONS_GROUP_NAME, {
                object_types: ['system', 'channel'],
                target_type: 'system',
                target_id: '',
            });
            expect(mockClient.getPropertyFields).not.toHaveBeenCalled();

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(await getStoredFields(database)).toEqual(['channel-field-id', 'system-field-id']);
            const values = await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID);
            expect(values).toHaveLength(1);
            expect(values[0].value).toBe('opt-top-secret');
        });

        it('should clear stale data when the search returns no fields', async () => {
            const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            await operator.handlePropertyFields({fields: [systemField], prepareRecordsOnly: false});
            await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

            setConfig({FeatureFlagClassificationMarkings: 'true', Version: '11.10.0'});
            mockClient.searchPropertyFields.mockResolvedValueOnce([]);

            await fetchAccessControlAttributeFields(serverUrl);

            expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
            expect(await getStoredFields(database)).toHaveLength(0);
            expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(0);
        });
    });
});

describe('fetchChannelAttributeValues', () => {
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
        setConfig({FeatureFlagClassificationMarkings: 'false'});

        const result = await fetchChannelAttributeValues(serverUrl, channelId);

        expect(result).toEqual({});
        expect(mockClient.getPropertyValues).not.toHaveBeenCalled();
    });

    it('should persist channel values to DB on happy path', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);

        const result = await fetchChannelAttributeValues(serverUrl, channelId);
        expect(result).toEqual({});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const values = await getStoredValues(database, channelId);
        expect(values).toHaveLength(1);
        expect(values[0].value).toBe('opt-secret');
    });

    it('should clear existing channel values when API returns none', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [channelValue], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchChannelAttributeValues(serverUrl, channelId);
        expect(result).toEqual({});

        expect(await getStoredValues(database, channelId)).toHaveLength(0);
    });

    it('should return error when network client throws', async () => {
        setConfig({FeatureFlagClassificationMarkings: 'true'});
        const networkError = new Error('network failure');
        mockClient.getPropertyValues.mockRejectedValueOnce(networkError);

        const result = await fetchChannelAttributeValues(serverUrl, channelId);
        expect(result).toEqual({error: networkError});
    });

    it('should isolate values across different targets', async () => {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [systemValue], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);
        await operator.handlePropertyFields({fields: [channelField], prepareRecordsOnly: false});

        await fetchChannelAttributeValues(serverUrl, channelId);

        expect(await getStoredValues(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID)).toHaveLength(1);
        expect(await getStoredValues(database, channelId)).toHaveLength(1);
    });

    it('should force a field refresh when the value references an unknown option', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [channelField], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([{...channelValue, value: 'opt-unknown'}]);
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchChannelAttributeValues(serverUrl, channelId);

        expect(mockClient.getPropertyFields).toHaveBeenCalled();
        expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-unknown')).toBe(true);
    });

    it('should look the option up on the channel field rather than the system field', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channelOnly = {...channelField, attrs: {options: [{id: 'opt-channel-only', name: 'CHANNEL ONLY', color: '#00FF00'}]}};
        await operator.handlePropertyFields({fields: [systemField, channelOnly], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([{...channelValue, value: 'opt-channel-only'}]);

        await fetchChannelAttributeValues(serverUrl, channelId);

        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should not force a field refresh when the value option is already known', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [channelField], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]); // value opt-secret is a known option

        await fetchChannelAttributeValues(serverUrl, channelId);

        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
        expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-secret')).toBe(false);
    });

    it('should not force a field refresh again for an option already attempted this session', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [channelField], prepareRecordsOnly: false});
        EphemeralStore.setClassificationFieldSyncAttempted(serverUrl, 'opt-unknown');

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([{...channelValue, value: 'opt-unknown'}]);

        await fetchChannelAttributeValues(serverUrl, channelId);

        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should not mark the option attempted when the forced refresh fails', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyFields({fields: [channelField], prepareRecordsOnly: false});

        setConfig({FeatureFlagClassificationMarkings: 'true'});
        mockClient.getPropertyValues.mockResolvedValueOnce([{...channelValue, value: 'opt-unknown'}]);
        mockClient.getPropertyFields.mockRejectedValueOnce(new Error('network failure'));

        await fetchChannelAttributeValues(serverUrl, channelId);

        // A transient refresh failure must leave the guard unset so a later update retries.
        expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-unknown')).toBe(false);
    });
});
