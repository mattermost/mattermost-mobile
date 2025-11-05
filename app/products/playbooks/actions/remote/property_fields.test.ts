// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {handlePlaybookRunPropertyFields} from '@playbooks/actions/local/property_fields';
import TestHelper from '@test/test_helper';

import {fetchPlaybookRunPropertyFields, updatePlaybookRunPropertyValue} from './property_fields';

const serverUrl = 'baseHandler.test.com';
const runId = 'run-id-1';

const mockPropertyField = TestHelper.fakePlaybookRunAttribute({target_id: runId});
const mockPropertyField2 = TestHelper.fakePlaybookRunAttribute({target_id: runId});
const mockPropertyValue = TestHelper.fakePlaybookRunAttributeValue(mockPropertyField.id, runId);
const mockPropertyValue2 = TestHelper.fakePlaybookRunAttributeValue(mockPropertyField2.id, runId);

const mockClient = {
    fetchRunPropertyFields: jest.fn(),
    fetchRunPropertyValues: jest.fn(),
    setRunPropertyValue: jest.fn(),
};

jest.mock('@playbooks/actions/local/property_fields');

const throwFunc = () => {
    throw Error('error');
};

beforeAll(() => {
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    jest.clearAllMocks();
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('fetchPlaybookRunPropertyFields', () => {
    beforeEach(() => {
        jest.mocked(handlePlaybookRunPropertyFields).mockResolvedValue({data: true});
    });

    it('should fetch property fields and values successfully', async () => {
        mockClient.fetchRunPropertyFields.mockResolvedValueOnce([mockPropertyField, mockPropertyField2]);
        mockClient.fetchRunPropertyValues.mockResolvedValueOnce([mockPropertyValue, mockPropertyValue2]);

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockClient.fetchRunPropertyFields).toHaveBeenCalledWith(runId);
        expect(mockClient.fetchRunPropertyValues).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRunPropertyFields).toHaveBeenCalledWith(
            serverUrl,
            [mockPropertyField, mockPropertyField2],
            [mockPropertyValue, mockPropertyValue2],
        );
    });

    it('should fetch empty property fields and values', async () => {
        mockClient.fetchRunPropertyFields.mockResolvedValueOnce([]);
        mockClient.fetchRunPropertyValues.mockResolvedValueOnce([]);

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockClient.fetchRunPropertyFields).toHaveBeenCalledWith(runId);
        expect(mockClient.fetchRunPropertyValues).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRunPropertyFields).toHaveBeenCalledWith(
            serverUrl,
            [],
            [],
        );
    });

    it('should handle fetchOnly mode without storing in DB', async () => {
        mockClient.fetchRunPropertyFields.mockResolvedValueOnce([mockPropertyField]);
        mockClient.fetchRunPropertyValues.mockResolvedValueOnce([mockPropertyValue]);

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId, true);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockClient.fetchRunPropertyFields).toHaveBeenCalledWith(runId);
        expect(mockClient.fetchRunPropertyValues).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRunPropertyFields).not.toHaveBeenCalled();
    });

    it('should handle client error on fetchRunPropertyFields', async () => {
        mockClient.fetchRunPropertyFields.mockRejectedValueOnce(new Error('Client error'));

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(handlePlaybookRunPropertyFields).not.toHaveBeenCalled();
    });

    it('should handle client error on fetchRunPropertyValues', async () => {
        mockClient.fetchRunPropertyFields.mockResolvedValueOnce([mockPropertyField]);
        mockClient.fetchRunPropertyValues.mockRejectedValueOnce(new Error('Client error'));

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(handlePlaybookRunPropertyFields).not.toHaveBeenCalled();
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(handlePlaybookRunPropertyFields).not.toHaveBeenCalled();
    });

    it('should handle database storage error', async () => {
        mockClient.fetchRunPropertyFields.mockResolvedValueOnce([mockPropertyField]);
        mockClient.fetchRunPropertyValues.mockResolvedValueOnce([mockPropertyValue]);
        jest.mocked(handlePlaybookRunPropertyFields).mockResolvedValueOnce({error: new Error('DB error')});

        const result = await fetchPlaybookRunPropertyFields(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(mockClient.fetchRunPropertyFields).toHaveBeenCalledWith(runId);
        expect(mockClient.fetchRunPropertyValues).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRunPropertyFields).toHaveBeenCalled();
    });

    it('should fetch property fields and values in parallel', async () => {
        let propertyFieldsResolve: any;
        let propertyValuesResolve: any;

        const propertyFieldsPromise = new Promise((resolve) => {
            propertyFieldsResolve = resolve;
        });
        const propertyValuesPromise = new Promise((resolve) => {
            propertyValuesResolve = resolve;
        });

        mockClient.fetchRunPropertyFields.mockReturnValueOnce(propertyFieldsPromise);
        mockClient.fetchRunPropertyValues.mockReturnValueOnce(propertyValuesPromise);

        const resultPromise = fetchPlaybookRunPropertyFields(serverUrl, runId);

        // Resolve in reverse order to ensure parallel execution
        propertyValuesResolve([mockPropertyValue]);
        propertyFieldsResolve([mockPropertyField]);

        const result = await resultPromise;

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(handlePlaybookRunPropertyFields).toHaveBeenCalledWith(
            serverUrl,
            [mockPropertyField],
            [mockPropertyValue],
        );
    });
});

describe('updatePlaybookRunPropertyValue', () => {
    const fieldId = 'field-id-1';
    const value = 'test value';

    beforeEach(() => {
        jest.mocked(handlePlaybookRunPropertyFields).mockResolvedValue({data: true});
    });

    it('should update property value successfully', async () => {
        const updatedValue = {...mockPropertyValue, value};
        mockClient.setRunPropertyValue.mockResolvedValueOnce(updatedValue);

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, value);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.propertyValue).toEqual(updatedValue);
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, value);
        expect(handlePlaybookRunPropertyFields).toHaveBeenCalledWith(
            serverUrl,
            [],
            [updatedValue],
        );
    });

    it('should update property value for text field', async () => {
        const textValue = 'Some text content';
        const updatedValue = {...mockPropertyValue, value: textValue};
        mockClient.setRunPropertyValue.mockResolvedValueOnce(updatedValue);

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, textValue);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.propertyValue).toEqual(updatedValue);
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, textValue);
    });

    it('should update property value for select field', async () => {
        const selectValue = 'option-id-123';
        const updatedValue = {...mockPropertyValue, value: selectValue};
        mockClient.setRunPropertyValue.mockResolvedValueOnce(updatedValue);

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, selectValue);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.propertyValue).toEqual(updatedValue);
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, selectValue);
    });

    it('should update property value for multiselect field', async () => {
        const multiselectValue = '["option-id-1","option-id-2"]';
        const updatedValue = {...mockPropertyValue, value: multiselectValue};
        mockClient.setRunPropertyValue.mockResolvedValueOnce(updatedValue);

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, multiselectValue);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.propertyValue).toEqual(updatedValue);
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, multiselectValue);
    });

    it('should update property value with empty string', async () => {
        const emptyValue = '';
        const updatedValue = {...mockPropertyValue, value: emptyValue};
        mockClient.setRunPropertyValue.mockResolvedValueOnce(updatedValue);

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, emptyValue);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.propertyValue).toEqual(updatedValue);
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, emptyValue);
    });

    it('should handle client error', async () => {
        mockClient.setRunPropertyValue.mockRejectedValueOnce(new Error('Client error'));

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, value);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.propertyValue).toBeUndefined();
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, value);
        expect(handlePlaybookRunPropertyFields).not.toHaveBeenCalled();
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, value);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.propertyValue).toBeUndefined();
        expect(handlePlaybookRunPropertyFields).not.toHaveBeenCalled();
    });

    it('should handle database storage error', async () => {
        const updatedValue = {...mockPropertyValue, value};
        mockClient.setRunPropertyValue.mockResolvedValueOnce(updatedValue);
        jest.mocked(handlePlaybookRunPropertyFields).mockResolvedValueOnce({error: new Error('DB error')});

        const result = await updatePlaybookRunPropertyValue(serverUrl, runId, fieldId, value);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.propertyValue).toBeUndefined();
        expect(mockClient.setRunPropertyValue).toHaveBeenCalledWith(runId, fieldId, value);
        expect(handlePlaybookRunPropertyFields).toHaveBeenCalled();
    });
});
