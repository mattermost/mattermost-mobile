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

jest.mock('@store/classification_banner_store', () => ({
    setClassificationBannerState: jest.fn(),
}));

const {setClassificationBannerState} = require('@store/classification_banner_store');
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

const defaultState = {visible: false, levelName: '', color: ''};

describe('fetchClassificationBanner', () => {
    it('should set default state when feature flag is not true', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('false');

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, defaultState);
        expect(mockClient.getPropertyFields).not.toHaveBeenCalled();
    });

    it('should set default state when template field is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, defaultState);
    });

    it('should set default state when linked field is missing', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, defaultState);
    });

    it('should set default state when DISPLAY_BANNER_TOP is not in actions', async () => {
        const linkedFieldNoAction = {
            ...linkedField,
            attrs: {...linkedField.attrs, actions: ['display_banner_bottom']},
        } as PropertyField;

        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedFieldNoAction]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, defaultState);
    });

    it('should set default state when no system property value matches the linked field', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, defaultState);
    });

    it('should set visible state with level name and color on happy path', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockClient.getPropertyFields.mockResolvedValueOnce([templateField]);
        mockClient.getPropertyFields.mockResolvedValueOnce([linkedField]);
        mockClient.getSystemPropertyValues.mockResolvedValueOnce([systemValue]);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, {
            visible: true,
            levelName: 'TOP SECRET',
            color: '#FCE83A',
        });
    });

    it('should set default state and return error when network client throws', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const networkError = new Error('network failure');
        mockClient.getPropertyFields.mockRejectedValueOnce(networkError);

        const result = await fetchClassificationBanner(serverUrl);

        expect(result).toEqual({error: networkError});
        expect(setClassificationBannerState).toHaveBeenCalledWith(serverUrl, defaultState);
    });
});
