// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import type ServerDataOperator from '@database/operator/server_data_operator';

function createPlaybookRuns(runsCount = 1, maxChecklistCount = 1, maxItemsPerChecklist = 1): PlaybookRun[] {
    const playbookRuns: PlaybookRun[] = [];
    for (let i = 0; i < runsCount; i++) {
        const checklists: PlaybookChecklist[] = [];
        const checklistCount = Math.floor(Math.random() * maxChecklistCount) + 1;
        for (let j = 0; j < checklistCount; j++) {
            const items: PlaybookChecklistItem[] = [];
            const itemsCount = Math.floor(Math.random() * maxItemsPerChecklist) + 1;
            for (let k = 0; k < itemsCount; k++) {
                items.push({
                    id: `item_${k}`,
                    title: `Item ${k + 1} of Checklist ${j + 1}`,
                    description: 'Item description',
                    state: '',
                    state_modified: 0,
                    assignee_id: '',
                    assignee_modified: 0,
                    command: '',
                    command_last_run: 0,
                    due_date: 0,
                    order: 0,
                    completed_at: 0,
                });
            }
            checklists.push({
                id: `checklist_${j}`,
                title: `Checklist ${j + 1}`,
                items,
            });
        }
        playbookRuns.push({
            id: `playbook_run_${i}`,
            name: `Playbook Run ${i + 1}`,
            playbook_id: 'playbook_1',
            post_id: 'post_1',
            owner_user_id: 'user_1',
            team_id: 'team_1',
            channel_id: 'channel_1',
            create_at: 1620000000000,
            end_at: 0,
            delete_at: 0,
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
            sumary_modified_at: 0,
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
            metrics_data: [],
            checklists,
        });
    }
    return playbookRuns;
}

describe('PlaybookHandler', () => {
    let operator: ServerDataOperator;

    beforeAll(async () => {
        await DatabaseManager.init(['playbookHandler.test.com']);
        operator = DatabaseManager.serverDatabases['playbookHandler.test.com']!.operator;
    });

    describe('handlePlaybookRun', () => {
        it('should return an empty array if runs is undefined or empty', async () => {
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

            const result = await operator.handlePlaybookRun({
                runs: undefined,
                prepareRecordsOnly: true,
                removeAssociatedRecords: false,
            });

            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();
        });

        it('should process runs correctly', async () => {
            const mockRuns: PlaybookRun[] = createPlaybookRuns(2, 2, 3);

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockRuns.length);
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
        });
    });
});
