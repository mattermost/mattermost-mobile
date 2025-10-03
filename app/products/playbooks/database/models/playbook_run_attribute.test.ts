// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import PlaybookRunAttributeModel from './playbook_run_attribute';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PLAYBOOK_RUN_ATTRIBUTE} = PLAYBOOK_TABLES;

const SERVER_URL = `playbookRunAttributeModel.test.${Date.now()}.com`;

const applyMockData = (attribute: PlaybookRunAttributeModel, mockData: PlaybookRunAttribute, includeAttrs = true) => {
    attribute._raw.id = mockData.id;
    attribute.groupId = mockData.group_id;
    attribute.name = mockData.name;
    attribute.type = mockData.type;
    attribute.targetId = mockData.target_id;
    attribute.targetType = mockData.target_type;
    attribute.createAt = mockData.create_at;
    attribute.updateAt = mockData.update_at;
    attribute.deleteAt = mockData.delete_at;
    if (includeAttrs) {
        attribute.attrs = mockData.attrs || '{"placeholder": "Enter value"}';
    }
};

describe('PlaybookRunAttributeModel', () => {
    let operator: ServerDataOperator;
    let playbook_run_attribute: PlaybookRunAttributeModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        await database.write(async () => {
            playbook_run_attribute = await database.get<PlaybookRunAttributeModel>(PLAYBOOK_RUN_ATTRIBUTE).create((attribute: PlaybookRunAttributeModel) => {
                applyMockData(attribute, TestHelper.createPlaybookRunAttribute('test', 0));
            });
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should match model', () => {
        expect(playbook_run_attribute).toBeDefined();
        expect(playbook_run_attribute.id).toBe('test-attribute_0');
        expect(playbook_run_attribute.groupId).toBe('group_1');
        expect(playbook_run_attribute.name).toBe('Attribute 1');
        expect(playbook_run_attribute.type).toBe('text');
        expect(playbook_run_attribute.targetId).toBe('test');
        expect(playbook_run_attribute.targetType).toBe('playbook_run');
        expect(playbook_run_attribute.createAt).toBeGreaterThan(0);
        expect(playbook_run_attribute.updateAt).toBeGreaterThan(0);
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
                applyMockData(attribute, TestHelper.createPlaybookRunAttribute('test', 1), false);
            });
        });

        expect(attributeWithoutAttrs!).toBeDefined();
        expect(attributeWithoutAttrs!.id).toBe('test-attribute_1');
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
