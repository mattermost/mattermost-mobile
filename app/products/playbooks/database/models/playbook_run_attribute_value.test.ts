// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import PlaybookRunModel from './playbook_run';
import PlaybookRunAttributeModel from './playbook_run_attribute';
import PlaybookRunAttributeValueModel from './playbook_run_attribute_value';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PLAYBOOK_RUN_ATTRIBUTE_VALUE, PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN} = PLAYBOOK_TABLES;

const SERVER_URL = `playbookRunAttributeValueModel.test.${Date.now()}.com`;

describe('PlaybookRunAttributeValueModel', () => {
    let operator: ServerDataOperator;
    let playbook_run_attribute_value: PlaybookRunAttributeValueModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        await database.write(async () => {
            // Create a playbook run
            await database.get<PlaybookRunModel>(PLAYBOOK_RUN).create((run: PlaybookRunModel) => {
                run._raw.id = 'playbook_run_1';
                run.playbookId = 'playbook_1';
                run.postId = 'post_1';
                run.ownerUserId = 'user_1';
                run.teamId = 'team_1';
                run.channelId = 'channel_1';
                run.createAt = 1620000000000;
                run.endAt = 0;
                run.name = 'Test Playbook Run';
                run.description = 'Test description';
                run.isActive = true;
                run.activeStage = 1;
                run.activeStageTitle = 'Stage 1';
                run.participantIds = ['user_1'];
                run.summary = 'Test summary';
                run.currentStatus = 'InProgress';
                run.lastStatusUpdateAt = 1620000001000;
                run.retrospectiveEnabled = false;
                run.retrospective = '';
                run.retrospectivePublishedAt = 0;
                run.updateAt = 1620000002000;
            });

            // Create a playbook run attribute
            await database.get<PlaybookRunAttributeModel>(PLAYBOOK_RUN_ATTRIBUTE).create((attribute: PlaybookRunAttributeModel) => {
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

            // Create a playbook run attribute value
            playbook_run_attribute_value = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).create((attributeValue: PlaybookRunAttributeValueModel) => {
                attributeValue._raw.id = 'attribute_value_1';
                attributeValue.attributeId = 'attribute_1';
                attributeValue.runId = 'playbook_run_1';
                attributeValue.value = 'Test Value';
            });
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should match model', () => {
        expect(playbook_run_attribute_value).toBeDefined();
        expect(playbook_run_attribute_value.id).toBe('attribute_value_1');
        expect(playbook_run_attribute_value.attributeId).toBe('attribute_1');
        expect(playbook_run_attribute_value.runId).toBe('playbook_run_1');
        expect(playbook_run_attribute_value.value).toBe('Test Value');
    });

    it('=> should have the correct table name', () => {
        expect(PlaybookRunAttributeValueModel.table).toBe(PLAYBOOK_RUN_ATTRIBUTE_VALUE);
    });

    it('=> should have correct associations defined', () => {
        expect(PlaybookRunAttributeValueModel.associations).toBeDefined();
        expect(PlaybookRunAttributeValueModel.associations[PLAYBOOK_RUN_ATTRIBUTE]).toEqual({
            type: 'belongs_to',
            key: 'attribute_id',
        });
        expect(PlaybookRunAttributeValueModel.associations[PLAYBOOK_RUN]).toEqual({
            type: 'belongs_to',
            key: 'run_id',
        });
    });

    it('=> should have attribute relation', async () => {
        const attributeRelation = playbook_run_attribute_value.attribute;
        expect(attributeRelation).toBeDefined();

        const relatedAttribute = await attributeRelation.fetch();
        expect(relatedAttribute).toBeDefined();
        expect(relatedAttribute!.id).toBe('attribute_1');
        expect(relatedAttribute!.name).toBe('Test Attribute');
    });

    it('=> should have run relation', async () => {
        const runRelation = playbook_run_attribute_value.run;
        expect(runRelation).toBeDefined();

        const relatedRun = await runRelation.fetch();
        expect(relatedRun).toBeDefined();
        expect(relatedRun!.id).toBe('playbook_run_1');
        expect(relatedRun!.name).toBe('Test Playbook Run');
    });

    it('=> should allow updating value', async () => {
        const {database} = operator;

        await database.write(async () => {
            await playbook_run_attribute_value.update((attributeValue: PlaybookRunAttributeValueModel) => {
                attributeValue.value = 'Updated Test Value';
            });
        });

        expect(playbook_run_attribute_value.value).toBe('Updated Test Value');
    });

    it('=> should handle empty value', async () => {
        let attributeValueWithEmptyValue: PlaybookRunAttributeValueModel;
        const {database} = operator;

        await database.write(async () => {
            attributeValueWithEmptyValue = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).create((attributeValue: PlaybookRunAttributeValueModel) => {
                attributeValue._raw.id = 'attribute_value_2';
                attributeValue.attributeId = 'attribute_1';
                attributeValue.runId = 'playbook_run_1';
                attributeValue.value = '';
            });
        });

        expect(attributeValueWithEmptyValue!).toBeDefined();
        expect(attributeValueWithEmptyValue!.value).toBe('');
    });

    it('=> should handle long text values', async () => {
        const longValue = 'This is a very long text value that might be used to store detailed information about the playbook run attribute. It could contain multiple sentences and various types of content.';

        let attributeValueWithLongText: PlaybookRunAttributeValueModel;
        const {database} = operator;

        await database.write(async () => {
            attributeValueWithLongText = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).create((attributeValue: PlaybookRunAttributeValueModel) => {
                attributeValue._raw.id = 'attribute_value_3';
                attributeValue.attributeId = 'attribute_1';
                attributeValue.runId = 'playbook_run_1';
                attributeValue.value = longValue;
            });
        });

        expect(attributeValueWithLongText!).toBeDefined();
        expect(attributeValueWithLongText!.value).toBe(longValue);
    });
});
