// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {
    fetchCustomProfileAttributes,
    updateCustomProfileAttributes,
} from './custom_profile';

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn().mockReturnValue({
        operator: {
            batchRecords: jest.fn(),
            handleCustomProfileFields: jest.fn(),
            handleCustomProfileAttributes: jest.fn(),
        },
    }),
}));

beforeAll(() => {
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

const mockClient = {
    getCustomProfileAttributeFields: jest.fn(),
    getCustomProfileAttributeValues: jest.fn(),
    updateCustomProfileAttributeValues: jest.fn(),
};
const serverUrl = 'baseHandler.test.com';

describe('Custom Profile Attributes', () => {
    it('fetchCustomProfileAttributes - base case without filter', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'field1', name: 'Field 1', attrs: {sort_order: 1}},
            {id: 'field2', name: 'Field 2', attrs: {sort_order: 2}},
            {id: 'field3', name: 'Field 3', attrs: {sort_order: 3}},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            field1: 'value1',
            field2: '',
            field3: 'value3',
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(Object.keys(result.attributes!)).toHaveLength(3);
        expect(result.attributes!.field1).toEqual({
            id: 'field1',
            name: 'Field 1',
            type: 'text',
            value: 'value1',
            sort_order: 1,
        });
        expect(result.attributes!.field2).toEqual({
            id: 'field2',
            name: 'Field 2',
            type: 'text',
            value: '',
            sort_order: 2,
        });
        expect(result.attributes!.field3).toEqual({
            id: 'field3',
            name: 'Field 3',
            type: 'text',
            value: 'value3',
            sort_order: 3,
        });
    });

    it('fetchCustomProfileAttributes - with filter empty values', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'field1', name: 'Field 1'},
            {id: 'field2', name: 'Field 2'},
            {id: 'field3', name: 'Field 3'},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            field1: 'value1',
            field2: '',
            field3: 'value3',
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1', true);
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(Object.keys(result.attributes!)).toHaveLength(2);
        expect(result.attributes!.field1).toEqual({
            id: 'field1',
            name: 'Field 1',
            type: 'text',
            value: 'value1',
            sort_order: undefined,
        });
        expect(result.attributes!.field2).toBeUndefined();
        expect(result.attributes!.field3).toEqual({
            id: 'field3',
            name: 'Field 3',
            type: 'text',
            value: 'value3',
            sort_order: undefined,
        });
    });

    it('fetchCustomProfileAttributes - no fields', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({});

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeUndefined();
        expect(result.attributes).toEqual({});
    });

    it('fetchCustomProfileAttributes - error on fields', async () => {
        const error = new Error('Sample error');

        mockClient.getCustomProfileAttributeFields = jest.fn().mockRejectedValue(error);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            field1: 'value1',
            field2: 'value2',
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeDefined();
    });

    it('fetchCustomProfileAttributes - error on values', async () => {
        const error = new Error('Sample error');

        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'field1', name: 'Field 1'},
            {id: 'field2', name: 'Field 2'},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockRejectedValue(error);

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeDefined();
    });

    it('updateCustomProfileAttributes - base case', async () => {
        mockClient.updateCustomProfileAttributeValues = jest.fn().mockResolvedValue({});

        const attributes = {
            field1: {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                value: 'new value 1',
            },
            field2: {
                id: 'field2',
                name: 'Field 2',
                type: 'text',
                value: 'new value 2',
            },
        };

        const result = await updateCustomProfileAttributes(serverUrl, 'user1', attributes);
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(mockClient.updateCustomProfileAttributeValues).toHaveBeenCalledWith({
            field1: 'new value 1',
            field2: 'new value 2',
        });
    });

    it('updateCustomProfileAttributes - error', async () => {
        const error = new Error('Test Error');

        mockClient.updateCustomProfileAttributeValues = jest.fn().mockRejectedValue(error);

        const attributes = {
            field1: {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                value: 'new value 1',
            },
        };

        const result = await updateCustomProfileAttributes(serverUrl, 'user1', attributes);
        expect(result.error).toBeDefined();
        expect(result.success).toBe(false);
    });

    // New tests for array handling functionality
    it('fetchCustomProfileAttributes - handles multiselect array values correctly', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'multiselect1', name: 'Multiselect 1', type: 'multiselect', attrs: {sort_order: 1}},
            {id: 'select1', name: 'Select 1', type: 'select', attrs: {sort_order: 2}},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            multiselect1: ['opt1', 'opt2', 'opt3'],
            select1: 'single_opt',
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(Object.keys(result.attributes!)).toHaveLength(2);

        // Array should be serialized to JSON string
        expect(result.attributes!.multiselect1).toEqual({
            id: 'multiselect1',
            name: 'Multiselect 1',
            type: 'multiselect',
            value: '["opt1","opt2","opt3"]',
            sort_order: 1,
        });

        // Single value should remain as string
        expect(result.attributes!.select1).toEqual({
            id: 'select1',
            name: 'Select 1',
            type: 'select',
            value: 'single_opt',
            sort_order: 2,
        });
    });

    it('fetchCustomProfileAttributes - handles empty arrays correctly', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'multiselect1', name: 'Multiselect 1', type: 'multiselect'},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            multiselect1: [],
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(result.attributes!.multiselect1).toEqual({
            id: 'multiselect1',
            name: 'Multiselect 1',
            type: 'multiselect',
            value: '[]',
        });
    });

    it('fetchCustomProfileAttributes - handles null and undefined values correctly', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'field1', name: 'Field 1', type: 'text'},
            {id: 'field2', name: 'Field 2', type: 'multiselect'},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            field1: null,
            field2: undefined,
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(result.attributes!.field1.value).toBe('');
        expect(result.attributes!.field2.value).toBe('');
    });

    it('fetchCustomProfileAttributes - handles mixed data types correctly', async () => {
        mockClient.getCustomProfileAttributeFields = jest.fn().mockResolvedValue([
            {id: 'text_field', name: 'Text Field', type: 'text'},
            {id: 'number_field', name: 'Number Field', type: 'number'},
            {id: 'multiselect_field', name: 'Multiselect Field', type: 'multiselect'},
            {id: 'select_field', name: 'Select Field', type: 'select'},
        ]);
        mockClient.getCustomProfileAttributeValues = jest.fn().mockResolvedValue({
            text_field: 'text value',
            number_field: 42,
            multiselect_field: ['opt1', 'opt2'],
            select_field: 'single_opt',
        });

        const result = await fetchCustomProfileAttributes(serverUrl, 'user1');
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();

        expect(result.attributes!.text_field.value).toBe('text value');
        expect(result.attributes!.number_field.value).toBe('42');
        expect(result.attributes!.multiselect_field.value).toBe('["opt1","opt2"]');
        expect(result.attributes!.select_field.value).toBe('single_opt');
    });
});
