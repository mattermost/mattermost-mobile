// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import PlaybookRunModel from './playbook_run';
import PlaybookRunAttributeModel from './playbook_run_attribute';
import PlaybookRunAttributeValueModel from './playbook_run_attribute_value';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PLAYBOOK_RUN_ATTRIBUTE_VALUE, PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN} = PLAYBOOK_TABLES;

const SERVER_URL = `playbookRunAttributeValueModel.test.${Date.now()}.com`;

const applyRunData = (run: PlaybookRunModel, mockData: PlaybookRun) => {
    run._raw.id = mockData.id;
    run.playbookId = mockData.playbook_id;
    run.postId = mockData.post_id ?? null;
    run.ownerUserId = mockData.owner_user_id;
    run.teamId = mockData.team_id;
    run.channelId = mockData.channel_id;
    run.createAt = mockData.create_at;
    run.endAt = mockData.end_at;
    run.name = mockData.name;
    run.description = mockData.description;
    run.isActive = mockData.is_active;
    run.activeStage = mockData.active_stage;
    run.activeStageTitle = mockData.active_stage_title;
    run.participantIds = mockData.participant_ids;
    run.summary = mockData.summary;
    run.currentStatus = mockData.current_status;
    run.lastStatusUpdateAt = mockData.last_status_update_at;
    run.retrospectiveEnabled = mockData.retrospective_enabled;
    run.retrospective = mockData.retrospective;
    run.retrospectivePublishedAt = mockData.retrospective_published_at;
    run.updateAt = mockData.update_at;
};

const applyAttributeData = (attribute: PlaybookRunAttributeModel, mockData: PlaybookRunAttribute) => {
    attribute._raw.id = mockData.id;
    attribute.groupId = mockData.group_id;
    attribute.name = mockData.name;
    attribute.type = mockData.type;
    attribute.targetId = mockData.target_id;
    attribute.targetType = mockData.target_type;
    attribute.createAt = mockData.create_at;
    attribute.updateAt = mockData.update_at;
    attribute.deleteAt = mockData.delete_at;
    attribute.attrs = mockData.attrs;
};

const applyAttributeValueData = (attributeValue: PlaybookRunAttributeValueModel, mockData: PlaybookRunAttributeValue) => {
    attributeValue._raw.id = mockData.id;
    attributeValue.attributeId = mockData.attribute_id;
    attributeValue.runId = mockData.run_id;
    attributeValue.value = mockData.value;
};

describe('PlaybookRunAttributeValueModel', () => {
    let operator: ServerDataOperator;
    let playbook_run_attribute_value: PlaybookRunAttributeValueModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        const mockRun = TestHelper.createPlaybookRuns(1, 0, 0)[0];
        const mockAttribute = TestHelper.createPlaybookRunAttribute('test', 0);
        const mockAttributeValue = TestHelper.createPlaybookRunAttributeValue(mockAttribute.id, mockRun.id, 0);

        await database.write(async () => {
            await database.get<PlaybookRunModel>(PLAYBOOK_RUN).create((run) => applyRunData(run, mockRun));
            await database.get<PlaybookRunAttributeModel>(PLAYBOOK_RUN_ATTRIBUTE).create((attr) => applyAttributeData(attr, mockAttribute));
            playbook_run_attribute_value = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).create((attrVal) => applyAttributeValueData(attrVal, mockAttributeValue));
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should match model', () => {
        expect(playbook_run_attribute_value).toBeDefined();
        expect(playbook_run_attribute_value.id).toBe('playbook_run_0-test-attribute_0-value_0');
        expect(playbook_run_attribute_value.attributeId).toBe('test-attribute_0');
        expect(playbook_run_attribute_value.runId).toBe('playbook_run_0');
        expect(playbook_run_attribute_value.value).toBe('Value 1');
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
        expect(relatedAttribute!.id).toBe('test-attribute_0');
        expect(relatedAttribute!.name).toBe('Attribute 1');
    });

    it('=> should have run relation', async () => {
        const runRelation = playbook_run_attribute_value.run;
        expect(runRelation).toBeDefined();

        const relatedRun = await runRelation.fetch();
        expect(relatedRun).toBeDefined();
        expect(relatedRun!.id).toBe('playbook_run_0');
        expect(relatedRun!.name).toBe('Playbook Run 1');
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
            const mockData = TestHelper.createPlaybookRunAttributeValue('test-attribute_0', 'playbook_run_0', 1);
            attributeValueWithEmptyValue = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).create((attributeValue: PlaybookRunAttributeValueModel) => {
                applyAttributeValueData(attributeValue, mockData);
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
            const mockData = TestHelper.createPlaybookRunAttributeValue('test-attribute_0', 'playbook_run_0', 2);
            attributeValueWithLongText = await database.get<PlaybookRunAttributeValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).create((attributeValue: PlaybookRunAttributeValueModel) => {
                applyAttributeValueData(attributeValue, mockData);
                attributeValue.value = longValue;
            });
        });

        expect(attributeValueWithLongText!).toBeDefined();
        expect(attributeValueWithLongText!.value).toBe(longValue);
    });
});
