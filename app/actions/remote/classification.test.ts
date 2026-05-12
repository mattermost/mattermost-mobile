// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';

import {fetchClassificationBanner} from './classification';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

jest.mock('@store/system_property_store', () => ({
    registerGroupName: jest.fn(),
    updatePropertyField: jest.fn(),
    updateSystemPropertyValues: jest.fn(),
    removePropertyFieldById: jest.fn(),
    getPropertyFields: jest.fn(() => []),
    getSystemPropertyValues: jest.fn(() => []),
    subscribe: jest.fn(() => jest.fn()),
    usePropertyStoreGroup: jest.fn(() => ({fields: [], values: []})),
    getGroupIdByName: jest.fn(),
}));

const {registerGroupName, updatePropertyField, updateSystemPropertyValues, removePropertyFieldById} = require('@store/system_property_store');
const mockedGetConfigValue = jest.mocked(getConfigValue);

const serverUrl = 'classification.test.com';

const templateField: PropertyField = {
    id: 'template-field-id',
    group_id: 'classification_markings',
    name: 'classification',
    type: 'select',
    object_type: 'template',
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

const linkedField: PropertyField = {
    id: 'linked-field-id',
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

const systemValue: PropertyValue<string> = {
    id: 'val-1',
    target_id: 'system',
    target_type: 'system',
    group_id: 'classification_markings',
    field_id: 'linked-field-id',
    value: 'opt-top-secret',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
};

const mockClient = {
    getPropertyFields: jest.fn(),
    getSystemPropertyValues: jest.fn(),
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
        expect(updatePropertyField).not.toHaveBeenCalled();
        expect(updateSystemPropertyValues).not.toHaveBeenCalled();
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should merge only linked field into store when template is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(updatePropertyField).toHaveBeenCalledWith(serverUrl, linkedField);
        expect(updateSystemPropertyValues).toHaveBeenCalledWith(serverUrl, 'classification_markings', [systemValue]);
    });

    it('should return early when no fields are returned by the API', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).not.toHaveBeenCalled();
        expect(updatePropertyField).not.toHaveBeenCalled();
        expect(updateSystemPropertyValues).not.toHaveBeenCalled();
    });

    it('should merge only template field into store when linked is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(updatePropertyField).toHaveBeenCalledWith(serverUrl, templateField);
        expect(updateSystemPropertyValues).not.toHaveBeenCalled();
    });

    it('should merge both fields and values into store on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(updatePropertyField).toHaveBeenCalledWith(serverUrl, templateField);
        expect(updatePropertyField).toHaveBeenCalledWith(serverUrl, linkedField);
        expect(updateSystemPropertyValues).toHaveBeenCalledWith(serverUrl, 'classification_markings', [systemValue]);
    });

    it('should remove soft-deleted fields from store', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const deletedTemplate = {...templateField, delete_at: 5000};
        mockClient.getPropertyFields.mockResolvedValueOnce([deletedTemplate]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(removePropertyFieldById).toHaveBeenCalledWith(serverUrl, deletedTemplate.id);
        expect(updatePropertyField).toHaveBeenCalledWith(serverUrl, linkedField);
        expect(updatePropertyField).not.toHaveBeenCalledWith(serverUrl, deletedTemplate);
    });

    it('should return error without modifying store when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyFields.mockRejectedValueOnce(networkError);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({error: networkError});
        expect(updatePropertyField).not.toHaveBeenCalled();
        expect(updateSystemPropertyValues).not.toHaveBeenCalled();
    });
});
