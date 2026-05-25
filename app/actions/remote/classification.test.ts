// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';

import {fetchClassificationBanner, fetchChannelClassificationValue} from './classification';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

jest.mock('@store/system_property_store', () => ({
    registerGroupName: jest.fn(),
    setPropertyFields: jest.fn(),
    updatePropertyValues: jest.fn(),
    getPropertyFields: jest.fn(() => []),
    getPropertyValuesForTarget: jest.fn(() => []),
    subscribe: jest.fn(() => jest.fn()),
    usePropertyStoreGroup: jest.fn(() => ({fields: []})),
    getGroupIdByName: jest.fn(),
}));

jest.mock('@actions/local/properties', () => ({
    hydratePropertyStore: jest.fn().mockResolvedValue(undefined),
}));

const {hydratePropertyStore} = require('@actions/local/properties');
const {registerGroupName, setPropertyFields, updatePropertyValues} = require('@store/system_property_store');
const mockedGetConfigValue = jest.mocked(getConfigValue);

const serverUrl = 'classification.test.com';

const systemField: PropertyField = {
    id: 'system-field-id',
    group_id: 'classification_markings',
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
    group_id: 'classification_markings',
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
    group_id: 'classification_markings',
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
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(updatePropertyValues).not.toHaveBeenCalled();
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should store system field when channel field is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(setPropertyFields).toHaveBeenCalledWith(serverUrl, 'classification_markings', [systemField]);
        expect(updatePropertyValues).toHaveBeenCalledWith(serverUrl, 'system', 'classification_markings', [systemValue]);
    });

    it('should return early when no fields are returned by the API', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).not.toHaveBeenCalled();
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should store channel field when system field is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(setPropertyFields).toHaveBeenCalledWith(serverUrl, 'classification_markings', [channelField]);
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should store all active fields and values on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(setPropertyFields).toHaveBeenCalledWith(
            serverUrl,
            'classification_markings',
            expect.arrayContaining([systemField, channelField]),
        );
        expect(setPropertyFields.mock.calls[0][2]).toHaveLength(2);
        expect(updatePropertyValues).toHaveBeenCalledWith(serverUrl, 'system', 'classification_markings', [systemValue]);
    });

    it('should exclude soft-deleted fields from the stored set', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const deletedSystem = {...systemField, delete_at: 5000};
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedSystem]);
        mockClient.getPropertyFields.mockResolvedValueOnce([channelField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setPropertyFields).toHaveBeenCalledWith(serverUrl, 'classification_markings', [channelField]);
    });

    it('should return early when fields have mismatched group_ids', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const differentGroupField = {...channelField, group_id: 'other_group'};
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([differentGroupField]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should return error without modifying store when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyFields.mockRejectedValueOnce(networkError);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({error: networkError});
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should call hydratePropertyStore as offline fallback when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockRejectedValueOnce(new Error('network failure'));

        await fetchClassificationBanner(serverUrl);

        expect(hydratePropertyStore).toHaveBeenCalledWith(serverUrl);
    });

    it('should not call hydratePropertyStore on the success path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([systemField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        await fetchClassificationBanner(serverUrl);

        expect(hydratePropertyStore).not.toHaveBeenCalled();
    });
});

describe('fetchChannelClassificationValue', () => {
    const channelId = 'channel-123';

    const channelValue: PropertyValue<string> = {
        id: 'cv-1',
        target_id: channelId,
        target_type: 'channel',
        group_id: 'classification_markings',
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
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should store channel values on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);

        expect(result).toEqual({});
        expect(updatePropertyValues).toHaveBeenCalledWith(serverUrl, channelId, 'classification_markings', [channelValue]);
    });

    it('should return early when API returns no values', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);

        expect(result).toEqual({});
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should return early when group_id is empty', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const noGroupValue = {...channelValue, group_id: ''};
        mockClient.getPropertyValues.mockResolvedValueOnce([noGroupValue]);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);

        expect(result).toEqual({});
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should return error when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyValues.mockRejectedValueOnce(networkError);

        const result = await fetchChannelClassificationValue(serverUrl, channelId);

        expect(result).toEqual({error: networkError});
        expect(updatePropertyValues).not.toHaveBeenCalled();
    });

    it('should call hydratePropertyStore as offline fallback when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockRejectedValueOnce(new Error('network failure'));

        await fetchChannelClassificationValue(serverUrl, channelId);

        expect(hydratePropertyStore).toHaveBeenCalledWith(serverUrl);
    });

    it('should not call hydratePropertyStore on the success path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyValues.mockResolvedValueOnce([channelValue]);

        await fetchChannelClassificationValue(serverUrl, channelId);

        expect(hydratePropertyStore).not.toHaveBeenCalled();
    });
});
