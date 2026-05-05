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
    setPropertyFields: jest.fn(),
    setSystemPropertyValues: jest.fn(),
    getPropertyFields: jest.fn(() => []),
    getSystemPropertyValues: jest.fn(() => []),
    subscribe: jest.fn(() => jest.fn()),
    usePropertyStoreGroup: jest.fn(() => ({fields: [], values: []})),
    getGroupIdByName: jest.fn(),
}));

const {registerGroupName, setPropertyFields, setSystemPropertyValues} = require('@store/system_property_store');
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
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(setSystemPropertyValues).not.toHaveBeenCalled();
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should seed store with only linked field when template is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(setPropertyFields).toHaveBeenCalledWith(serverUrl, 'classification_markings', [linkedField]);
        expect(setSystemPropertyValues).toHaveBeenCalledWith(serverUrl, 'classification_markings', [systemValue]);
    });

    it('should return early when neither field is found', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).not.toHaveBeenCalled();
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(setSystemPropertyValues).not.toHaveBeenCalled();
    });

    it('should seed store with only template field when linked is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(setPropertyFields).toHaveBeenCalledWith(serverUrl, 'classification_markings', [templateField]);
        expect(setSystemPropertyValues).toHaveBeenCalledWith(serverUrl, 'classification_markings', []);
    });

    it('should seed store with both fields and values on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(registerGroupName).toHaveBeenCalledWith(serverUrl, 'classification_markings', 'classification_markings');
        expect(setPropertyFields).toHaveBeenCalledWith(serverUrl, 'classification_markings', [templateField, linkedField]);
        expect(setSystemPropertyValues).toHaveBeenCalledWith(serverUrl, 'classification_markings', [systemValue]);
    });

    it('should return error without modifying store when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyFields.mockRejectedValueOnce(networkError);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({error: networkError});
        expect(setPropertyFields).not.toHaveBeenCalled();
        expect(setSystemPropertyValues).not.toHaveBeenCalled();
    });
});
