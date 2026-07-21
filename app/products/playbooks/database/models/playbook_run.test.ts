// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

const SERVER_URL = 'playbookRunModel.test.com';

describe('PlaybookRunModel', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    describe('timelineEvents', () => {
        it.each([
            ['malformed JSON', '{invalid'],
            ['empty JSON', ''],
        ])('returns an empty array for %s', async (_name, storedValue) => {
            const run = TestHelper.createPlaybookRuns(1, 0, 0, true)[0];
            await operator.handlePlaybookRun({runs: [run], prepareRecordsOnly: false, processChildren: true});
            const runModel = await operator.database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(run.id);

            await operator.database.write(async () => {
                await runModel.update((record) => {
                    (record._raw as unknown as Record<string, string>).timeline_events = storedValue;
                });
            });

            expect(runModel.timelineEvents).toEqual([]);
        });

        it('keeps well-formed events and drops malformed entries', async () => {
            const run = TestHelper.createPlaybookRuns(1, 0, 0, true)[0];
            await operator.handlePlaybookRun({runs: [run], prepareRecordsOnly: false, processChildren: true});
            const runModel = await operator.database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(run.id);

            const validEvent = {
                id: 'event-1',
                playbook_run_id: run.id,
                create_at: 1,
                event_at: 1000,
                event_type: 'task_state_modified',
                summary: '',
                details: '{"action":"check"}',
                post_id: '',
                subject_user_id: 'user-1',
                creator_user_id: 'user-1',
            };

            await operator.database.write(async () => {
                await runModel.update((record) => {
                    (record._raw as unknown as Record<string, string>).timeline_events = JSON.stringify([
                        validEvent,
                        {event_type: 'task_state_modified'}, // missing event_at/details/subject_user_id
                        'not-an-object',
                        null,
                    ]);
                });
            });

            expect(runModel.timelineEvents).toEqual([validEvent]);
        });
    });

    describe('prepareDestroyWithRelations', () => {
        it('should prepare run and all its checklists and items for destruction when run has checklists with items', async () => {
            // Create playbook runs with checklists and items
            const mockRuns = TestHelper.createPlaybookRuns(1, 2, 3, true); // 1 run, 2 checklists, 3 items per checklist

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                processChildren: true,
            });

            const runId = mockRuns[0].id;

            // Get the created run model
            const runModel = await operator.database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(runId);

            // Call the method under test
            const preparedModels = await runModel.prepareDestroyWithRelations();

            // Calculate expected count: 1 run + 2 checklists + (2 checklists * 3 items each) = 9 total
            const expectedCount = 1 + 2 + (2 * 3);
            expect(preparedModels).toHaveLength(expectedCount);

            // Verify the run is prepared for destruction
            const runPrepared = preparedModels.find((model) => model.id === runId);
            expect(runPrepared).toBeDefined();
            expect(runPrepared!.collection.table).toBe(PLAYBOOK_RUN);

            // Verify all checklists are prepared for destruction
            const checklistIds = mockRuns[0].checklists.map((checklist) => checklist.id);
            checklistIds.forEach((checklistId) => {
                const checklistPrepared = preparedModels.find((model) => model.id === checklistId);
                expect(checklistPrepared).toBeDefined();
                expect(checklistPrepared!.collection.table).toBe(PLAYBOOK_CHECKLIST);
            });

            // Verify all items are prepared for destruction
            const itemIds = mockRuns[0].checklists.flatMap((checklist) =>
                checklist.items.map((item) => item.id),
            );
            itemIds.forEach((itemId) => {
                const itemPrepared = preparedModels.find((model) => model.id === itemId);
                expect(itemPrepared).toBeDefined();
                expect(itemPrepared!.collection.table).toBe(PLAYBOOK_CHECKLIST_ITEM);
            });
        });

        it('should prepare only run for destruction when run has no checklists', async () => {
            // Create playbook runs with no checklists
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0, true); // 1 run, 0 checklists, 0 items

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                processChildren: true,
            });

            const runId = mockRuns[0].id;

            // Get the created run model
            const runModel = await operator.database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(runId);

            // Call the method under test
            const preparedModels = await runModel.prepareDestroyWithRelations();

            // Verify the result
            expect(preparedModels).toHaveLength(1); // Only the run

            // Verify the run is prepared for destruction
            const runPrepared = preparedModels[0];
            expect(runPrepared.id).toBe(runId);
            expect(runPrepared.collection.table).toBe(PLAYBOOK_RUN);
        });

        it('should prepare run and checklists for destruction when checklists have no items', async () => {
            // Create playbook runs with checklists but no items
            const mockRuns = TestHelper.createPlaybookRuns(1, 3, 0, true); // 1 run, 3 checklists, 0 items

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                processChildren: true,
            });

            const runId = mockRuns[0].id;

            // Get the created run model
            const runModel = await operator.database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(runId);

            // Call the method under test
            const preparedModels = await runModel.prepareDestroyWithRelations();

            // Verify the result: 1 run + 3 checklists = 4 total
            expect(preparedModels).toHaveLength(4);

            // Verify the run is prepared for destruction
            const runPrepared = preparedModels.find((model) => model.id === runId);
            expect(runPrepared).toBeDefined();
            expect(runPrepared!.collection.table).toBe(PLAYBOOK_RUN);

            // Verify all checklists are prepared for destruction
            const checklistIds = mockRuns[0].checklists.map((checklist) => checklist.id);
            checklistIds.forEach((checklistId) => {
                const checklistPrepared = preparedModels.find((model) => model.id === checklistId);
                expect(checklistPrepared).toBeDefined();
                expect(checklistPrepared!.collection.table).toBe(PLAYBOOK_CHECKLIST);
            });
        });
    });
});
