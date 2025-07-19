// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {OperationType} from '@constants/database';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {PlaybookRunModel} from '@playbooks/database/models';

import {transformPlaybookChecklistItemRecord, transformPlaybookChecklistRecord, transformPlaybookRunRecord} from '.';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

const {PLAYBOOK_RUN} = PLAYBOOK_TABLES;

describe('*** PLAYBOOK_RUN Prepare Records Test ***', () => {
    it('=> transformPlaybookRunRecord: should return a record of type PlaybookRun for CREATE action', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'playbook_run_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecord = await transformPlaybookRunRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'playbook_run_1',
                    playbook_id: 'playbook_1',
                    post_id: 'post_1',
                    owner_user_id: 'user_1',
                    team_id: 'team_1',
                    channel_id: 'channel_1',
                    create_at: 1620000000000,
                    end_at: 0,
                    name: 'Test Playbook Run',
                    description: 'This is a test playbook run',
                    is_active: true,
                    active_stage: 1,
                    active_stage_title: 'Stage 1',
                    participant_ids: ['user_1', 'user_2'],
                    summary: 'Test summary',
                    current_status: 'InProgress',
                    last_status_update_at: 1620000001000,
                    retrospective_enabled: true,
                    retrospective: 'Test retrospective',
                    retrospective_published_at: 1620000002000,
                    summary_modified_at: 0,
                    reported_user_id: '',
                    previous_reminder: 0,
                    status_update_enabled: false,
                    retrospective_was_canceled: false,
                    retrospective_reminder_interval_seconds: 0,
                    message_on_join: '',
                    category_name: '',
                    create_channel_member_on_new_participant: false,
                    remove_channel_member_on_removed_participant: false,
                    invited_user_ids: [],
                    invited_group_ids: [],
                    timeline_events: [],
                    broadcast_channel_ids: [],
                    webhook_on_creation_urls: [],
                    webhook_on_status_update_urls: [],
                    status_posts: [],
                    checklists: [],
                    metrics_data: [],
                    update_at: 1620000003000,
                    items_order: [],
                },
            },
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.collection.table).toBe(PLAYBOOK_RUN);
    });

    it('=> transformPlaybookRunRecord: should return a record of type PlaybookRun for UPDATE action', async () => {
        expect.assertions(4);

        const database = await createTestConnection({databaseName: 'playbook_run_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        // Create an existing record to simulate the UPDATE action
        let existingRecord: PlaybookRunModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<PlaybookRunModel>(PLAYBOOK_RUN).create((record) => {
                record._raw.id = 'playbook_run_2';
                record.playbookId = 'playbook_2';
                record.postId = 'post_2';
                record.ownerUserId = 'user_2';
                record.teamId = 'team_2';
                record.channelId = 'channel_2';
                record.createAt = 1620000000000;
                record.endAt = 0;
                record.name = 'Existing Playbook Run';
                record.description = 'This is an existing playbook run';
                record.isActive = true;
                record.activeStage = 1;
                record.activeStageTitle = 'Stage 1';
                record.participantIds = ['user_2', 'user_3'];
                record.summary = 'Existing summary';
                record.currentStatus = 'InProgress';
                record.lastStatusUpdateAt = 1620000001000;
                record.retrospectiveEnabled = true;
                record.retrospective = 'Existing retrospective';
                record.retrospectivePublishedAt = 1620000002000;
                record.updateAt = 1620000003000;
            });
        });

        const preparedRecord = await transformPlaybookRunRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    id: 'playbook_run_2',
                    playbook_id: 'playbook_2',
                    post_id: 'post_2',
                    owner_user_id: 'user_2',
                    team_id: 'team_2',
                    channel_id: 'channel_2',
                    create_at: 1620000000000,
                    end_at: 1620000003000,
                    name: 'Updated Playbook Run',
                    description: 'This is an updated playbook run',
                    is_active: false,
                    active_stage: 2,
                    active_stage_title: 'Stage 2',
                    participant_ids: ['user_2', 'user_4'],
                    summary: 'Updated summary',
                    current_status: 'Finished',
                    last_status_update_at: 1620000004000,
                    retrospective_enabled: false,
                    retrospective: 'Updated retrospective',
                    retrospective_published_at: 1620000005000,
                    summary_modified_at: 0,
                    reported_user_id: '',
                    previous_reminder: 0,
                    status_update_enabled: false,
                    retrospective_was_canceled: false,
                    retrospective_reminder_interval_seconds: 0,
                    message_on_join: '',
                    category_name: '',
                    create_channel_member_on_new_participant: false,
                    remove_channel_member_on_removed_participant: false,
                    invited_user_ids: [],
                    invited_group_ids: [],
                    timeline_events: [],
                    broadcast_channel_ids: [],
                    webhook_on_creation_urls: [],
                    webhook_on_status_update_urls: [],
                    status_posts: [],
                    checklists: [],
                    metrics_data: [],
                    update_at: 1620000004000,
                    items_order: [],
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.currentStatus).toBe('Finished');
        expect(preparedRecord!.collection.table).toBe(PLAYBOOK_RUN);
    });

    it('=> transformPlaybookRunRecord: should throw an error for non-create action without an existing record', async () => {
        expect.assertions(2);

        const database = await createTestConnection({databaseName: 'playbook_run_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        await expect(
            transformPlaybookRunRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'playbook_run_3',
                        playbook_id: 'playbook_3',
                        post_id: 'post_3',
                        owner_user_id: 'user_3',
                        team_id: 'team_3',
                        channel_id: 'channel_3',
                        create_at: 1620000000000,
                        end_at: 0,
                        name: 'Invalid Playbook Run',
                        description: 'This should throw an error',
                        is_active: true,
                        active_stage: 1,
                        active_stage_title: 'Stage 1',
                        participant_ids: ['user_3', 'user_4'],
                        summary: 'Invalid summary',
                        current_status: 'InProgress',
                        last_status_update_at: 1620000001000,
                        retrospective_enabled: true,
                        retrospective: 'Invalid retrospective',
                        retrospective_published_at: 1620000002000,
                        summary_modified_at: 0,
                        reported_user_id: '',
                        previous_reminder: 0,
                        status_update_enabled: false,
                        retrospective_was_canceled: false,
                        retrospective_reminder_interval_seconds: 0,
                        message_on_join: '',
                        category_name: '',
                        create_channel_member_on_new_participant: false,
                        remove_channel_member_on_removed_participant: false,
                        invited_user_ids: [],
                        invited_group_ids: [],
                        timeline_events: [],
                        broadcast_channel_ids: [],
                        webhook_on_creation_urls: [],
                        webhook_on_status_update_urls: [],
                        status_posts: [],
                        checklists: [],
                        metrics_data: [],
                        update_at: 1620000005000,
                        items_order: [],
                    },
                },
            }),
        ).rejects.toThrow('Record not found for non create action');
    });

    it('=> transformPlaybookRunRecord: should keep most of the data if the partial run is empty', async () => {
        const database = await createTestConnection({databaseName: 'playbook_run_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        // Create an existing record to simulate the UPDATE action
        let existingRecord: PlaybookRunModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<PlaybookRunModel>(PLAYBOOK_RUN).create((record) => {
                record._raw.id = 'playbook_run_2';
                record.playbookId = 'playbook_2';
                record.postId = 'post_2';
                record.ownerUserId = 'user_2';
                record.teamId = 'team_2';
                record.channelId = 'channel_2';
                record.createAt = 1620000000000;
                record.endAt = 0;
                record.name = 'Existing Playbook Run';
                record.description = 'This is an existing playbook run';
                record.isActive = true;
                record.activeStage = 1;
                record.activeStageTitle = 'Stage 1';
                record.participantIds = ['user_2', 'user_3'];
                record.summary = 'Existing summary';
                record.currentStatus = 'InProgress';
                record.lastStatusUpdateAt = 1620000001000;
                record.retrospectiveEnabled = true;
                record.retrospective = 'Existing retrospective';
                record.retrospectivePublishedAt = 1620000002000;
                record.updateAt = 1620000003000;
                record.lastSyncAt = 1620000003000;
                record.itemsOrder = ['checklist_1', 'checklist_2'];
            });
        });

        const lastSyncAt = existingRecord!.lastSyncAt;

        const preparedRecord = await transformPlaybookRunRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    id: 'playbook_run_2',
                    update_at: 1620000004000,
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord.playbookId).toBe('playbook_2');
        expect(preparedRecord.postId).toBe('post_2');
        expect(preparedRecord.ownerUserId).toBe('user_2');
        expect(preparedRecord.teamId).toBe('team_2');
        expect(preparedRecord.channelId).toBe('channel_2');
        expect(preparedRecord.createAt).toBe(1620000000000);
        expect(preparedRecord.endAt).toBe(0);
        expect(preparedRecord.name).toBe('Existing Playbook Run');
        expect(preparedRecord.description).toBe('This is an existing playbook run');
        expect(preparedRecord.isActive).toBe(true);
        expect(preparedRecord.activeStage).toBe(1);
        expect(preparedRecord.activeStageTitle).toBe('Stage 1');
        expect(preparedRecord.participantIds).toEqual(['user_2', 'user_3']);
        expect(preparedRecord.summary).toBe('Existing summary');
        expect(preparedRecord.currentStatus).toBe('InProgress');
        expect(preparedRecord.lastStatusUpdateAt).toBe(1620000001000);
        expect(preparedRecord.retrospectiveEnabled).toBe(true);
        expect(preparedRecord.retrospective).toBe('Existing retrospective');
        expect(preparedRecord.retrospectivePublishedAt).toBe(1620000002000);
        expect(preparedRecord.itemsOrder).toEqual(['checklist_1', 'checklist_2']);

        // Changing values
        expect(preparedRecord.updateAt).toBe(1620000004000);
        expect(preparedRecord.lastSyncAt).toBeGreaterThan(lastSyncAt);
    });
});
describe('*** PLAYBOOK_CHECKLIST Prepare Records Test ***', () => {
    it('=> transformPlaybookChecklistRecord: should return a record of type PlaybookChecklist for CREATE action', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'playbook_checklist_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecord = await transformPlaybookChecklistRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'checklist_1',
                    run_id: 'playbook_run_1',
                    title: 'Checklist 1',
                    update_at: 0,
                    items_order: [],
                    items: [],
                },
            },
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.collection.table).toBe(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST);
    });

    it('=> transformPlaybookChecklistRecord: should return a record of type PlaybookChecklist for UPDATE action', async () => {
        expect.assertions(4);

        const database = await createTestConnection({databaseName: 'playbook_checklist_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        let existingRecord: PlaybookChecklistModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<PlaybookChecklistModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).create((record) => {
                record._raw.id = 'checklist_2';
                record.runId = 'playbook_run_2';
                record.title = 'Existing Checklist';
                record.updateAt = 0;
                record.itemsOrder = [];
            });
        });

        const preparedRecord = await transformPlaybookChecklistRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    id: 'checklist_2',
                    run_id: 'playbook_run_2',
                    title: 'Updated Checklist',
                    update_at: 0,
                    items_order: [],
                    items: [],
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.title).toBe('Updated Checklist');
        expect(preparedRecord!.collection.table).toBe(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST);
    });

    it('=> transformPlaybookChecklistRecord: should throw an error for non-create action without an existing record', async () => {
        expect.assertions(2);

        const database = await createTestConnection({databaseName: 'playbook_checklist_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        await expect(
            transformPlaybookChecklistRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'checklist_3',
                        run_id: 'playbook_run_3',
                        title: 'Invalid Checklist',
                        update_at: 0,
                        items_order: [],
                        items: [],
                    },
                },
            }),
        ).rejects.toThrow('Record not found for non create action');
    });

    it('=> transformPlaybookChecklistRecord: should keep most of the data if the partial checklist is empty', async () => {
        const database = await createTestConnection({databaseName: 'playbook_checklist_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        // Create an existing record to simulate the UPDATE action
        let existingRecord: PlaybookChecklistModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<PlaybookChecklistModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).create((record) => {
                record._raw.id = 'checklist_2';
                record.runId = 'playbook_run_2';
                record.title = 'Existing Checklist';
                record.updateAt = 1620000003000;
                record.itemsOrder = ['item_1', 'item_2'];
                record.lastSyncAt = 1620000003000;
            });
        });

        const lastSyncAt = existingRecord!.lastSyncAt;

        const preparedRecord = await transformPlaybookChecklistRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    id: 'checklist_2',
                    run_id: 'playbook_run_2',
                    update_at: 1620000004000,
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.title).toBe('Existing Checklist');
        expect(preparedRecord!.runId).toBe('playbook_run_2');
        expect(preparedRecord!.itemsOrder).toEqual(['item_1', 'item_2']);

        // Changing values
        expect(preparedRecord!.updateAt).toBe(1620000004000);
        expect(preparedRecord!.lastSyncAt).toBeGreaterThan(lastSyncAt);
    });
});

describe('*** PLAYBOOK_CHECKLIST_ITEM Prepare Records Test ***', () => {
    it('=> transformPlaybookChecklistItemRecord: should return a record of type PlaybookChecklistItem for CREATE action', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'playbook_checklist_item_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecord = await transformPlaybookChecklistItemRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'checklist_item_1',
                    checklist_id: 'checklist_1',
                    title: 'Checklist Item 1',
                    state: '',
                    state_modified: 1620000000000,
                    assignee_id: 'user_1',
                    assignee_modified: 1620000001000,
                    command: '/test-command',
                    command_last_run: 1620000002000,
                    description: 'Test description',
                    due_date: 1620000003000,
                    completed_at: 0,
                    task_actions: [],
                    update_at: 0,
                },
            },
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.collection.table).toBe(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM);
    });

    it('=> transformPlaybookChecklistItemRecord: should return a record of type PlaybookChecklistItem for UPDATE action', async () => {
        expect.assertions(4);

        const database = await createTestConnection({databaseName: 'playbook_checklist_item_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        let existingRecord: PlaybookChecklistItemModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).create((record) => {
                record._raw.id = 'checklist_item_2';
                record.checklistId = 'checklist_2';
                record.title = 'Existing Checklist Item';
                record.state = '';
                record.stateModified = 1620000000000;
                record.assigneeId = 'user_2';
                record.assigneeModified = 1620000001000;
                record.command = '/existing-command';
                record.commandLastRun = 1620000002000;
                record.description = 'Existing description';
                record.dueDate = 1620000003000;
                record.completedAt = 0;
                record.taskActions = [];
                record.updateAt = 0;
            });
        });

        const preparedRecord = await transformPlaybookChecklistItemRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    id: 'checklist_item_2',
                    checklist_id: 'checklist_2',
                    title: 'Updated Checklist Item',
                    state: 'closed',
                    state_modified: 1620000004000,
                    assignee_id: 'user_3',
                    assignee_modified: 1620000005000,
                    command: '/updated-command',
                    command_last_run: 1620000006000,
                    description: 'Updated description',
                    due_date: 1620000007000,
                    completed_at: 1620000008000,
                    task_actions: [],
                    update_at: 0,
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.title).toBe('Updated Checklist Item');
        expect(preparedRecord!.collection.table).toBe(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM);
    });

    it('=> transformPlaybookChecklistItemRecord: should throw an error for non-create action without an existing record', async () => {
        expect.assertions(2);

        const database = await createTestConnection({databaseName: 'playbook_checklist_item_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        await expect(
            transformPlaybookChecklistItemRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'checklist_item_3',
                        checklist_id: 'checklist_3',
                        title: 'Invalid Checklist Item',
                        state: '',
                        state_modified: 1620000000000,
                        assignee_id: 'user_4',
                        assignee_modified: 1620000001000,
                        command: '/invalid-command',
                        command_last_run: 1620000002000,
                        description: 'Invalid description',
                        due_date: 1620000003000,
                        completed_at: 0,
                        task_actions: [],
                        update_at: 0,
                    },
                },
            }),
        ).rejects.toThrow('Record not found for non create action');
    });

    it('=> transformPlaybookChecklistItemRecord: should keep most of the data if the partial checklist item is empty', async () => {
        const database = await createTestConnection({databaseName: 'playbook_checklist_item_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        // Create an existing record to simulate the UPDATE action
        let existingRecord: PlaybookChecklistItemModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).create((record) => {
                record._raw.id = 'checklist_item_2';
                record.checklistId = 'checklist_2';
                record.title = 'Existing Checklist Item';
                record.state = '';
                record.stateModified = 1620000000000;
                record.assigneeId = 'user_2';
                record.assigneeModified = 1620000001000;
                record.command = '/existing-command';
                record.commandLastRun = 1620000002000;
                record.description = 'Existing description';
                record.dueDate = 1620000003000;
                record.completedAt = 0;
                record.taskActions = [];
                record.updateAt = 0;
                record.lastSyncAt = 1620000003000;
            });
        });

        const lastSyncAt = existingRecord!.lastSyncAt;

        const preparedRecord = await transformPlaybookChecklistItemRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    id: 'checklist_item_2',
                    checklist_id: 'checklist_2',
                    update_at: 1620000004000,
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.title).toBe('Existing Checklist Item');
        expect(preparedRecord!.checklistId).toBe('checklist_2');
        expect(preparedRecord!.state).toBe('');
        expect(preparedRecord!.stateModified).toBe(1620000000000);
        expect(preparedRecord!.assigneeId).toBe('user_2');
        expect(preparedRecord!.assigneeModified).toBe(1620000001000);
        expect(preparedRecord!.command).toBe('/existing-command');
        expect(preparedRecord!.commandLastRun).toBe(1620000002000);
        expect(preparedRecord!.description).toBe('Existing description');
        expect(preparedRecord!.dueDate).toBe(1620000003000);
        expect(preparedRecord!.completedAt).toBe(0);
        expect(preparedRecord!.taskActions).toEqual([]);

        // Changing values
        expect(preparedRecord!.updateAt).toBe(1620000004000);
        expect(preparedRecord!.lastSyncAt).toBeGreaterThan(lastSyncAt);
    });
});
