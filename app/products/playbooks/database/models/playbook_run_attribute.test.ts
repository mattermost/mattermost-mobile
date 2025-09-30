// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import PlaybookRunAttributeModel from './playbook_run_attribute';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PLAYBOOK_RUN_ATTRIBUTE} = PLAYBOOK_TABLES;

const SERVER_URL = `playbookRunAttributeModel.test.${Date.now()}.com`;

describe('PlaybookRunAttributeModel', () => {
    let operator: ServerDataOperator;
    let playbook_run_attribute: PlaybookRunAttributeModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        // Debug: Check database state
        console.log('Schema version:', database.schema.version);

        // Check if our table exists in collections
        const collection = database.collections.get(PLAYBOOK_RUN_ATTRIBUTE);
        console.log('Our collection exists:', Boolean(collection));

        // List some table names from schema
        console.log('Tables in schema:', Object.keys(database.schema.tables));
        console.log('Looking for table:', PLAYBOOK_RUN_ATTRIBUTE);

        await database.write(async () => {
            playbook_run_attribute = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_RUN_ATTRIBUTE).create((attribute: PlaybookRunAttributeModel) => {
                attribute._raw.id = 'attribute_1';
                attribute.groupId = 'group_1';
                attribute.name = 'Test Attribute';
                attribute.type = 'text';
                attribute.targetId = 'target_1';
                attribute.targetType = 'playbook_run';
                attribute.createAt = 1620000000000;
                attribute.updateAt = 1620000001000;
                attribute.deleteAt = 0;
                attribute.attrs = '{"placeholder": "Enter value"}';
            });
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should match model', () => {
        expect(playbook_run_attribute).toBeDefined();
        expect(playbook_run_attribute.id).toBe('attribute_1');
        expect(playbook_run_attribute.groupId).toBe('group_1');
        expect(playbook_run_attribute.name).toBe('Test Attribute');
        expect(playbook_run_attribute.type).toBe('text');
        expect(playbook_run_attribute.targetId).toBe('target_1');
        expect(playbook_run_attribute.targetType).toBe('playbook_run');
        expect(playbook_run_attribute.createAt).toBe(1620000000000);
        expect(playbook_run_attribute.updateAt).toBe(1620000001000);
        expect(playbook_run_attribute.deleteAt).toBe(0);
        expect(playbook_run_attribute.attrs).toBe('{"placeholder": "Enter value"}');
    });

    it('=> should have the correct table name', () => {
        expect(PlaybookRunAttributeModel.table).toBe(PLAYBOOK_RUN_ATTRIBUTE);
    });

    it('=> should handle optional attrs field', async () => {
        let attributeWithoutAttrs: PlaybookRunAttributeModel;
        const {database} = operator;

        await database.write(async () => {
            attributeWithoutAttrs = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_RUN_ATTRIBUTE).create((attribute: PlaybookRunAttributeModel) => {
                attribute._raw.id = 'attribute_2';
                attribute.groupId = 'group_2';
                attribute.name = 'Test Attribute Without Attrs';
                attribute.type = 'number';
                attribute.targetId = 'target_2';
                attribute.targetType = 'playbook_run';
                attribute.createAt = 1620000002000;
                attribute.updateAt = 1620000003000;
                attribute.deleteAt = 0;
            });
        });

        expect(attributeWithoutAttrs!).toBeDefined();
        expect(attributeWithoutAttrs!.id).toBe('attribute_2');
        expect(attributeWithoutAttrs!.attrs).toBeNull();
    });

    it('=> should allow updating fields', async () => {
        const {database} = operator;

        await database.write(async () => {
            await playbook_run_attribute.update((attribute: PlaybookRunAttributeModel) => {
                attribute.name = 'Updated Attribute Name';
                attribute.type = 'number';
                attribute.updateAt = 1620000005000;
                attribute.attrs = '{"min": 0, "max": 100}';
            });
        });

        expect(playbook_run_attribute.name).toBe('Updated Attribute Name');
        expect(playbook_run_attribute.type).toBe('number');
        expect(playbook_run_attribute.updateAt).toBe(1620000005000);
        expect(playbook_run_attribute.attrs).toBe('{"min": 0, "max": 100}');
    });

    it('=> should handle deleteAt field correctly', async () => {
        const {database} = operator;

        await database.write(async () => {
            await playbook_run_attribute.update((attribute: PlaybookRunAttributeModel) => {
                attribute.deleteAt = 1620000010000;
            });
        });

        expect(playbook_run_attribute.deleteAt).toBe(1620000010000);
    });
});
