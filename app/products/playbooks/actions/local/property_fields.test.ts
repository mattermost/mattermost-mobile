// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import {handlePlaybookRunPropertyFields} from './property_fields';

import type {Database} from '@nozbe/watermelondb';
import type PlaybookRunAttributeModel from '@playbooks/types/database/models/playbook_run_attribute';
import type PlaybookRunAttributeValueModel from '@playbooks/types/database/models/playbook_run_attribute_value';

const serverUrl = 'baseHandler.test.com';

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePlaybookRunPropertyFields', () => {
    let database: Database;

    beforeEach(() => {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    it('should handle not found database', async () => {
        const propertyFields = [TestHelper.fakePlaybookRunAttribute()];
        const propertyValues: PlaybookRunPropertyValue[] = [];

        const {error} = await handlePlaybookRunPropertyFields('foo', propertyFields, propertyValues);
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle property fields successfully', async () => {
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Priority'}),
            TestHelper.fakePlaybookRunAttribute({id: 'field-2', name: 'Status'}),
        ];
        const propertyValues: PlaybookRunPropertyValue[] = [];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify property fields were stored
        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        expect(storedFields.length).toBe(2);
        expect(storedFields[0].id).toBe('field-1');
        expect(storedFields[0].name).toBe('Priority');
        expect(storedFields[1].id).toBe('field-2');
        expect(storedFields[1].name).toBe('Status');
    });

    it('should handle property values successfully', async () => {
        const propertyFields: PlaybookRunPropertyField[] = [];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {id: 'value-1', value: 'high'}),
            TestHelper.fakePlaybookRunAttributeValue('field-2', 'run-1', {id: 'value-2', value: 'in-progress'}),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify property values were stored
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedValues.length).toBe(2);
        expect(storedValues[0].id).toBe('value-1');
        expect(storedValues[0].value).toBe('high');
        expect(storedValues[1].id).toBe('value-2');
        expect(storedValues[1].value).toBe('in-progress');
    });

    it('should handle both property fields and values together', async () => {
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Priority'}),
        ];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {id: 'value-1', value: 'high'}),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify both were stored
        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields.length).toBe(1);
        expect(storedValues.length).toBe(1);
        expect(storedFields[0].id).toBe('field-1');
        expect(storedValues[0].id).toBe('value-1');
    });

    it('should handle empty property fields array', async () => {
        const propertyFields: PlaybookRunPropertyField[] = [];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {id: 'value-1', value: 'test'}),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Only values should be stored
        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields.length).toBe(0);
        expect(storedValues.length).toBe(1);
    });

    it('should handle empty property values array', async () => {
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Priority'}),
        ];
        const propertyValues: PlaybookRunPropertyValue[] = [];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Only fields should be stored
        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields.length).toBe(1);
        expect(storedValues.length).toBe(0);
    });

    it('should handle both empty arrays', async () => {
        const propertyFields: PlaybookRunPropertyField[] = [];
        const propertyValues: PlaybookRunPropertyValue[] = [];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Nothing should be stored
        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields.length).toBe(0);
        expect(storedValues.length).toBe(0);
    });

    it('should update existing property field', async () => {
        // First insert
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Priority', update_at: 1000}),
        ];
        await handlePlaybookRunPropertyFields(serverUrl, propertyFields, []);

        // Update with new name and timestamp
        const updatedFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Updated Priority', update_at: 2000}),
        ];
        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, updatedFields, []);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify update
        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        expect(storedFields.length).toBe(1);
        expect(storedFields[0].id).toBe('field-1');
        expect(storedFields[0].name).toBe('Updated Priority');
        expect(storedFields[0].updateAt).toBe(2000);
    });

    it('should update existing property value', async () => {
        // First insert
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {id: 'value-1', value: 'high'}),
        ];
        await handlePlaybookRunPropertyFields(serverUrl, [], propertyValues);

        // Update with new value
        const updatedValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {id: 'value-1', value: 'low'}),
        ];
        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, [], updatedValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify update
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedValues.length).toBe(1);
        expect(storedValues[0].id).toBe('value-1');
        expect(storedValues[0].value).toBe('low');
    });

    it('should handle text property field type', async () => {
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Description', type: 'text'}),
        ];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {
                id: 'value-1',
                value: 'This is a text value',
            }),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields[0].type).toBe('text');
        expect(storedValues[0].value).toBe('This is a text value');
    });

    it('should handle select property field type', async () => {
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Priority', type: 'select'}),
        ];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {
                id: 'value-1',
                value: 'option-id-123',
            }),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields[0].type).toBe('select');
        expect(storedValues[0].value).toBe('option-id-123');
    });

    it('should handle multiselect property field type with JSON array', async () => {
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Tags', type: 'multiselect'}),
        ];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', 'run-1', {
                id: 'value-1',
                value: '["option-id-1","option-id-2","option-id-3"]',
            }),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields[0].type).toBe('multiselect');
        expect(storedValues[0].value).toBe('["option-id-1","option-id-2","option-id-3"]');
    });

    it('should handle property field with attrs JSON', async () => {
        const attrs = JSON.stringify({
            options: [
                {id: 'opt-1', name: 'High'},
                {id: 'opt-2', name: 'Medium'},
                {id: 'opt-3', name: 'Low'},
            ],
            sort_order: 1,
            visibility: 'always',
            value_type: '',
        });

        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({
                id: 'field-1',
                name: 'Priority',
                type: 'select',
                attrs,
            }),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, []);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        expect(storedFields[0].attrs).toBe(attrs);
    });

    it('should handle multiple property fields for the same run', async () => {
        const runId = 'run-123';
        const propertyFields = [
            TestHelper.fakePlaybookRunAttribute({id: 'field-1', name: 'Priority', target_id: runId}),
            TestHelper.fakePlaybookRunAttribute({id: 'field-2', name: 'Status', target_id: runId}),
            TestHelper.fakePlaybookRunAttribute({id: 'field-3', name: 'Tags', target_id: runId}),
        ];
        const propertyValues = [
            TestHelper.fakePlaybookRunAttributeValue('field-1', runId, {id: 'value-1', value: 'high'}),
            TestHelper.fakePlaybookRunAttributeValue('field-2', runId, {id: 'value-2', value: 'in-progress'}),
            TestHelper.fakePlaybookRunAttributeValue('field-3', runId, {id: 'value-3', value: '["tag1","tag2"]'}),
        ];

        const {data, error} = await handlePlaybookRunPropertyFields(serverUrl, propertyFields, propertyValues);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const storedFields = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE).query().fetch();
        const storedValues = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN_ATTRIBUTE_VALUE).query().fetch();
        expect(storedFields.length).toBe(3);
        expect(storedValues.length).toBe(3);
    });
});
