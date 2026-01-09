// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    observePlaybookRunPropertyFields,
    getPlaybookRunPropertyFieldById,
    observePlaybookRunPropertyValues,
    observePlaybookRunPropertyValue,
    observePlaybookRunPropertyFieldsWithValues,
} from './property_fields';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Property Fields Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['propertyFields.test.com']);
        operator = DatabaseManager.serverDatabases['propertyFields.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('propertyFields.test.com');
    });

    describe('observePlaybookRunPropertyFields', () => {
        it('should observe property fields for a run', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-1',
                    target_id: runId,
                    target_type: 'run',
                    name: 'Priority',
                    type: 'select',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-2',
                    target_id: runId,
                    target_type: 'run',
                    name: 'Description',
                    type: 'text',
                    delete_at: 0,
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFields(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fields = subscriptionNext.mock.calls[0][0];
            expect(fields).toHaveLength(2);
            expect(fields[0].name).toBe('Priority');
            expect(fields[1].name).toBe('Description');
        });

        it('should filter out deleted property fields', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-2';
            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-1',
                    target_id: runId,
                    target_type: 'run',
                    name: 'Active Field',
                    type: 'text',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-2',
                    target_id: runId,
                    target_type: 'run',
                    name: 'Deleted Field',
                    type: 'text',
                    delete_at: 1620000000000,
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFields(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fields = subscriptionNext.mock.calls[0][0];
            expect(fields).toHaveLength(1);
            expect(fields[0].name).toBe('Active Field');
        });

        it('should only return property fields for the specified run', async () => {
            const subscriptionNext = jest.fn();
            const runId1 = 'run-id-1';
            const runId2 = 'run-id-2';
            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-1',
                    target_id: runId1,
                    target_type: 'run',
                    name: 'Field for Run 1',
                    type: 'text',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-2',
                    target_id: runId2,
                    target_type: 'run',
                    name: 'Field for Run 2',
                    type: 'text',
                    delete_at: 0,
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFields(operator.database, runId1);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fields = subscriptionNext.mock.calls[0][0];
            expect(fields).toHaveLength(1);
            expect(fields[0].name).toBe('Field for Run 1');
        });

        it('should return empty array when no property fields exist', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'nonexistent-run';

            const result = observePlaybookRunPropertyFields(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith([]);
        });

        it('should only return fields with target_type = run', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-1',
                    target_id: runId,
                    target_type: 'run',
                    name: 'Run Field',
                    type: 'text',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: 'field-2',
                    target_id: runId,
                    target_type: 'other',
                    name: 'Other Field',
                    type: 'text',
                    delete_at: 0,
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFields(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fields = subscriptionNext.mock.calls[0][0];
            expect(fields).toHaveLength(1);
            expect(fields[0].name).toBe('Run Field');
        });
    });

    describe('getPlaybookRunPropertyFieldById', () => {
        it('should return the property field if found', async () => {
            const fieldId = 'field-1';
            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId,
                    target_id: 'run-id-1',
                    target_type: 'run',
                    name: 'Priority',
                    type: 'select',
                    delete_at: 0,
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            const result = await getPlaybookRunPropertyFieldById(operator.database, fieldId);

            expect(result).toBeDefined();
            expect(result!.id).toBe(fieldId);
            expect(result!.name).toBe('Priority');
        });

        it('should return undefined if the property field is not found', async () => {
            const result = await getPlaybookRunPropertyFieldById(operator.database, 'nonexistent-field');

            expect(result).toBeUndefined();
        });
    });

    describe('observePlaybookRunPropertyValues', () => {
        it('should observe property values for a run', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId1 = 'field-1';
            const fieldId2 = 'field-2';
            const propertyValues = [
                TestHelper.fakePlaybookRunAttributeValue(fieldId1, runId, {
                    id: 'value-1',
                    value: 'high',
                }),
                TestHelper.fakePlaybookRunAttributeValue(fieldId2, runId, {
                    id: 'value-2',
                    value: 'Some text description',
                }),
            ];

            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyValues(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const values = subscriptionNext.mock.calls[0][0];
            expect(values).toHaveLength(2);
            const valueTexts = values.map((v: any) => v.value).sort();
            expect(valueTexts).toContain('high');
            expect(valueTexts).toContain('Some text description');
        });

        it('should only return values for the specified run', async () => {
            const subscriptionNext = jest.fn();
            const runId1 = 'run-id-1';
            const runId2 = 'run-id-2';
            const fieldId = 'field-1';
            const propertyValues = [
                TestHelper.fakePlaybookRunAttributeValue(fieldId, runId1, {
                    id: 'value-1',
                    value: 'Value for Run 1',
                }),
                TestHelper.fakePlaybookRunAttributeValue(fieldId, runId2, {
                    id: 'value-2',
                    value: 'Value for Run 2',
                }),
            ];

            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyValues(operator.database, runId1);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const values = subscriptionNext.mock.calls[0][0];
            expect(values).toHaveLength(1);
            expect(values[0].value).toBe('Value for Run 1');
        });

        it('should return empty array when no property values exist', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'nonexistent-run';

            const result = observePlaybookRunPropertyValues(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith([]);
        });

        it('should emit when a property value changes', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId = 'field-1';
            const valueId = 'value-1';

            // Create initial value
            const initialValue = TestHelper.fakePlaybookRunAttributeValue(fieldId, runId, {
                id: valueId,
                value: 'initial value',
            });

            await operator.handlePlaybookRunPropertyValue({
                propertyValues: [initialValue],
                prepareRecordsOnly: false,
            });

            // Subscribe to observable
            const result = observePlaybookRunPropertyValues(operator.database, runId);
            const subscription = result.subscribe({next: subscriptionNext});

            // Wait for initial emission
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(subscriptionNext).toHaveBeenCalled();
            const initialValues = subscriptionNext.mock.calls[0][0];
            expect(initialValues).toHaveLength(1);
            expect(initialValues[0].value).toBe('initial value');

            // Clear previous calls
            subscriptionNext.mockClear();

            // Update the value
            const updatedValue = TestHelper.fakePlaybookRunAttributeValue(fieldId, runId, {
                id: valueId,
                value: 'updated value',
                update_at: Date.now(),
            });

            await operator.handlePlaybookRunPropertyValue({
                propertyValues: [updatedValue],
                prepareRecordsOnly: false,
            });

            // Wait for the observer to emit the change
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Verify observer emitted with updated value
            expect(subscriptionNext).toHaveBeenCalled();
            const updatedValues = subscriptionNext.mock.calls[0][0];
            expect(updatedValues).toHaveLength(1);
            expect(updatedValues[0].value).toBe('updated value');

            subscription.unsubscribe();
        });
    });

    describe('observePlaybookRunPropertyValue', () => {
        it('should observe a specific property value by field ID and run ID', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId = 'field-1';
            const propertyValues = [
                TestHelper.fakePlaybookRunAttributeValue(fieldId, runId, {
                    id: 'value-1',
                    value: 'medium',
                }),
            ];

            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyValue(operator.database, fieldId, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const value = subscriptionNext.mock.calls[0][0];
            expect(value).toBeDefined();
            expect(value!.value).toBe('medium');
            expect(value!.attributeId).toBe(fieldId);
            expect(value!.runId).toBe(runId);
        });

        it('should return undefined if property value is not found', async () => {
            const subscriptionNext = jest.fn();
            const result = observePlaybookRunPropertyValue(operator.database, 'nonexistent-field', 'nonexistent-run');
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(undefined);
        });

        it('should return undefined if field ID matches but run ID does not', async () => {
            const subscriptionNext = jest.fn();
            const runId1 = 'run-id-1';
            const runId2 = 'run-id-2';
            const fieldId = 'field-1';
            const propertyValues = [
                TestHelper.fakePlaybookRunAttributeValue(fieldId, runId1, {
                    id: 'value-1',
                    value: 'Value for Run 1',
                }),
            ];

            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyValue(operator.database, fieldId, runId2);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(undefined);
        });
    });

    describe('observePlaybookRunPropertyFieldsWithValues', () => {
        it('should join property fields with their values', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId1 = 'field-1';
            const fieldId2 = 'field-2';
            const fieldId3 = 'field-3';

            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId1,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Priority',
                    type: 'select',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId2,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Description',
                    type: 'text',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId3,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Empty Field',
                    type: 'text',
                    delete_at: 0,
                }),
            ];

            const propertyValues = [
                TestHelper.fakePlaybookRunAttributeValue(fieldId1, runId, {
                    id: 'value-1',
                    value: 'high',
                }),
                TestHelper.fakePlaybookRunAttributeValue(fieldId2, runId, {
                    id: 'value-2',
                    value: 'Some description text',
                }),

                // fieldId3 has no value
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFieldsWithValues(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fieldsWithValues = subscriptionNext.mock.calls[0][0];
            expect(fieldsWithValues).toHaveLength(3);

            // Check field 1 with value
            expect(fieldsWithValues[0].propertyField.id).toBe(fieldId1);
            expect(fieldsWithValues[0].propertyField.name).toBe('Priority');
            expect(fieldsWithValues[0].value).toBeDefined();
            expect(fieldsWithValues[0].value!.value).toBe('high');

            // Check field 2 with value
            expect(fieldsWithValues[1].propertyField.id).toBe(fieldId2);
            expect(fieldsWithValues[1].propertyField.name).toBe('Description');
            expect(fieldsWithValues[1].value).toBeDefined();
            expect(fieldsWithValues[1].value!.value).toBe('Some description text');

            // Check field 3 without value
            expect(fieldsWithValues[2].propertyField.id).toBe(fieldId3);
            expect(fieldsWithValues[2].propertyField.name).toBe('Empty Field');
            expect(fieldsWithValues[2].value).toBeUndefined();
        });

        it('should return empty array when no property fields exist', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'nonexistent-run';

            const result = observePlaybookRunPropertyFieldsWithValues(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith([]);
        });

        it('should handle property fields without any values', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId1 = 'field-1';
            const fieldId2 = 'field-2';

            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId1,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Field 1',
                    type: 'text',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId2,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Field 2',
                    type: 'text',
                    delete_at: 0,
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFieldsWithValues(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fieldsWithValues = subscriptionNext.mock.calls[0][0];
            expect(fieldsWithValues).toHaveLength(2);
            expect(fieldsWithValues[0].value).toBeUndefined();
            expect(fieldsWithValues[1].value).toBeUndefined();
        });

        it('should filter out deleted property fields even with values', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId1 = 'field-1';
            const fieldId2 = 'field-2';

            const propertyFields = [
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId1,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Active Field',
                    type: 'text',
                    delete_at: 0,
                }),
                TestHelper.fakePlaybookRunAttribute({
                    id: fieldId2,
                    target_id: runId,
                    target_type: 'run',
                    name: 'Deleted Field',
                    type: 'text',
                    delete_at: 1620000000000,
                }),
            ];

            const propertyValues = [
                TestHelper.fakePlaybookRunAttributeValue(fieldId1, runId, {
                    id: 'value-1',
                    value: 'Value 1',
                }),
                TestHelper.fakePlaybookRunAttributeValue(fieldId2, runId, {
                    id: 'value-2',
                    value: 'Value 2',
                }),
            ];

            await operator.handlePlaybookRunPropertyField({
                propertyFields,
                prepareRecordsOnly: false,
            });

            await operator.handlePlaybookRunPropertyValue({
                propertyValues,
                prepareRecordsOnly: false,
            });

            const result = observePlaybookRunPropertyFieldsWithValues(operator.database, runId);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalled();
            const fieldsWithValues = subscriptionNext.mock.calls[0][0];
            expect(fieldsWithValues).toHaveLength(1);
            expect(fieldsWithValues[0].propertyField.name).toBe('Active Field');
            expect(fieldsWithValues[0].value!.value).toBe('Value 1');
        });

        it('should emit when a property value changes', async () => {
            const subscriptionNext = jest.fn();
            const runId = 'run-id-1';
            const fieldId = 'field-1';
            const valueId = 'value-1';

            // Create property field
            const propertyField = TestHelper.fakePlaybookRunAttribute({
                id: fieldId,
                target_id: runId,
                target_type: 'run',
                name: 'Test Field',
                type: 'text',
                delete_at: 0,
            });

            // Create initial value
            const initialValue = TestHelper.fakePlaybookRunAttributeValue(fieldId, runId, {
                id: valueId,
                value: 'initial value',
            });

            await operator.handlePlaybookRunPropertyField({
                propertyFields: [propertyField],
                prepareRecordsOnly: false,
            });

            await operator.handlePlaybookRunPropertyValue({
                propertyValues: [initialValue],
                prepareRecordsOnly: false,
            });

            // Subscribe to observable
            const result = observePlaybookRunPropertyFieldsWithValues(operator.database, runId);
            const subscription = result.subscribe({next: subscriptionNext});

            // Wait for initial emission
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(subscriptionNext).toHaveBeenCalled();
            const initialFieldsWithValues = subscriptionNext.mock.calls[0][0];
            expect(initialFieldsWithValues).toHaveLength(1);
            expect(initialFieldsWithValues[0].propertyField.id).toBe(fieldId);
            expect(initialFieldsWithValues[0].value).toBeDefined();
            expect(initialFieldsWithValues[0].value!.value).toBe('initial value');

            // Clear previous calls
            subscriptionNext.mockClear();

            // Update the value
            const updatedValue = TestHelper.fakePlaybookRunAttributeValue(fieldId, runId, {
                id: valueId,
                value: 'updated value',
                update_at: Date.now(),
            });

            await operator.handlePlaybookRunPropertyValue({
                propertyValues: [updatedValue],
                prepareRecordsOnly: false,
            });

            // Wait for the observer to emit the change
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Verify observer emitted with updated value
            expect(subscriptionNext).toHaveBeenCalled();
            const updatedFieldsWithValues = subscriptionNext.mock.calls[0][0];
            expect(updatedFieldsWithValues).toHaveLength(1);
            expect(updatedFieldsWithValues[0].propertyField.id).toBe(fieldId);
            expect(updatedFieldsWithValues[0].value).toBeDefined();
            expect(updatedFieldsWithValues[0].value!.value).toBe('updated value');

            subscription.unsubscribe();
        });
    });
});
