// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import * as dbUtils from '@database/operator/utils/general';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export const createPlaybookItem =(prefix: string, index: number): PlaybookChecklistItem => ({
    id: `${prefix}-item_${index}`,
    title: `Item ${index + 1} of Checklist ${prefix}`,
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

export const createPlaybookChecklist = (prefix: string, itemsCount: number, index: number): PlaybookChecklist => {
    const items: PlaybookChecklistItem[] = [];
    const id = `${prefix}-checklist_${index}`;
    for (let k = 0; k < itemsCount; k++) {
        items.push(createPlaybookItem(id, k));
    }

    return {
        id: `${prefix}-checklist_${index}`,
        title: `Checklist ${index + 1} of Playbook Run ${prefix}`,
        items,
    };
};

export function createPlaybookRuns(runsCount = 1, maxChecklistCount = 1, maxItemsPerChecklist = 1): PlaybookRun[] {
    const playbookRuns: PlaybookRun[] = [];
    for (let i = 0; i < runsCount; i++) {
        const checklists: PlaybookChecklist[] = [];
        const checklistCount = Math.floor(Math.random() * maxChecklistCount) + 1;
        for (let j = 0; j < checklistCount; j++) {
            const itemsCount = Math.floor(Math.random() * maxItemsPerChecklist) + 1;
            checklists.push(createPlaybookChecklist(`playbook_run_${i}`, itemsCount, j));
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

    beforeEach(async () => {
        await DatabaseManager.init(['playbookHandler.test.com']);
        operator = DatabaseManager.serverDatabases['playbookHandler.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('playbookHandler.test.com');
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
            const mockRuns = createPlaybookRuns(2, 2, 3);

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

        it('should delete runs without associated records', async () => {
            const mockRuns = createPlaybookRuns(2, 2, 3);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // Remove associated records
            });

            // Mark the runs for deletion by setting `delete_at` to a non-zero value
            mockRuns.forEach((run) => {
                run.delete_at = 1620000005000;
            });

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // No associated records to remove
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockRuns.length); // All runs should be processed
            expect(spyOnPrepareDestroy).not.toHaveBeenCalled(); // No associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the playbook_run table is empty
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(0);

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should create runs and process children', async () => {
            const mockRuns = createPlaybookRuns(2, 2, 3);

            // Calculate the expected total number of processed records
            const totalRuns = mockRuns.length;
            const allChecklists = mockRuns.reduce<PlaybookChecklist[]>((checklists, run) => {
                if (run.checklists.length) {
                    checklists.push(...run.checklists);
                }
                return checklists;
            }, []);
            const totalChecklists = allChecklists.length;
            const allChecklistItems = allChecklists.reduce<PlaybookChecklistItem[]>((items, checklist) => {
                if (checklist.items.length) {
                    items.push(...checklist.items);
                }
                return items;
            }, []);
            const totalChecklistItems = allChecklistItems.length;
            const expectedTotalRecords = totalChecklistItems + totalChecklists + totalRuns;

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
            const spyOnHandleChecklist = jest.spyOn(operator, 'handlePlaybookChecklist');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                processChildren: true, // Process associated checklists
            });

            // Assertions
            expect(result).toBeDefined();
            expect(result.length).toBe(expectedTotalRecords); // All runs should be processed
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(3); // Runs should be prepared
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once
            expect(spyOnHandleChecklist).toHaveBeenCalledTimes(1); // Checklists should be processed

            const {database} = operator;

            // Verify that the playbook_run table contains the created runs
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(mockRuns.length);

            // Verify that the checklist table contains the created checklists
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(totalChecklists);

            // Verify that the checklist_item table contains the created items
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(totalChecklistItems);
        });

        it('should delete runs with associated records', async () => {
            const mockRuns = createPlaybookRuns(2, 2, 3);
            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            // Calculate the expected total number of processed records
            const totalRuns = mockRuns.length;
            const allChecklists = mockRuns.reduce<PlaybookChecklist[]>((checklists, run) => {
                if (run.checklists.length) {
                    checklists.push(...run.checklists);
                }
                return checklists;
            }, []);
            const totalChecklists = allChecklists.length;
            const allChecklistItems = allChecklists.reduce<PlaybookChecklistItem[]>((items, checklist) => {
                if (checklist.items.length) {
                    items.push(...checklist.items);
                }
                return items;
            }, []);
            const totalChecklistItems = allChecklistItems.length;
            const expectedTotalRecords = totalChecklistItems + totalChecklists + totalRuns;

            // Mark the runs for deletion by setting `delete_at` to a non-zero value
            mockRuns.forEach((run) => {
                run.delete_at = 1620000005000; // Example timestamp
            });

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: true, // Remove associated records
            });

            // Assertions
            expect(result).toBeDefined();
            expect(result.length).toBe(expectedTotalRecords); // All runs should be processed
            expect(spyOnPrepareDestroy).toHaveBeenCalledTimes(1); // Associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the playbook_run table is empty
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(0);

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should handle runs with a combination of flags', async () => {
            const mockRuns = createPlaybookRuns(2, 2, 3); // Create 2 runs, each with up to 2 checklists and 3 items per checklist

            // first let's make sure the first run is in the database
            await operator.handlePlaybookRun({
                runs: [mockRuns[0]],
                prepareRecordsOnly: false, // Only prepare records, do not save to the database
                processChildren: true, // Process associated checklists
                removeAssociatedRecords: false, // Do not remove associated records
            });

            // Mark one of the runs for deletion
            mockRuns[0].delete_at = 1620000005000; // Example timestamp

            jest.clearAllMocks();
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnHandleChecklist = jest.spyOn(operator, 'handlePlaybookChecklist');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false, // Only prepare records, do not save to the database
                processChildren: true, // Process associated checklists
                removeAssociatedRecords: true, // Remove associated records for deleted runs
            });

            // Assertions
            expect(result).toBeDefined();

            // Verify that prepareRecords was called for the runs
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(3);

            // Verify that prepareDestroyPermanentlyChildrenAssociatedRecords was called for the deleted run
            expect(spyOnPrepareDestroy).toHaveBeenCalledTimes(1);

            // Verify that handlePlaybookChecklist was called to process children
            expect(spyOnHandleChecklist).toHaveBeenCalledTimes(1);

            // Verify that batchRecords was not called since prepareRecordsOnly is true
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);

            const {database} = operator;

            // Verify that the playbook_run table still contains the original runs since records were only prepared
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            const deletedRun = playbookRunRecords.find((run) => run.id === mockRuns[0].id);
            expect(deletedRun).toBeUndefined(); // No records should be saved

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBeGreaterThan(0);

            // Verify that none of the checklists of the deleted run are present
            const mockedDeleted = mockRuns[0];
            const deletedCheckListIds = new Set(mockedDeleted.checklists.map((checklist) => checklist.id));
            const deletedChecklists = checklistRecords.filter((checklist) => deletedCheckListIds.has(checklist.id));
            expect(deletedChecklists.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBeGreaterThan(0);

            // Verify that none of the checklist items of the deleted run are present
            const deletedCheckListItemsIds = new Set(mockedDeleted.checklists.reduce<string[]>((acc, checklist) => {
                const itemsIds = checklist.items.map((item) => item.id);
                return acc.concat(itemsIds);
            }, []));
            const deletedChecklistItems = checklistItemRecords.filter((checklist) => deletedCheckListItemsIds.has(checklist.id));
            expect(deletedChecklistItems.length).toBe(0);
        });
    });

    describe('handlePlaybookChecklist', () => {
        it('should return an empty array if checklists is undefined or empty', async () => {
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

            const result = await operator.handlePlaybookChecklist({
                checklists: undefined,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();
        });

        it('should process checklists correctly', async () => {
            const mockChecklists = [
                createPlaybookChecklist('playbook_run_1', 3, 0),
                createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                delete_at: 0,
                order: index,
            }));

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockChecklists.length);
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
        });

        it('should delete checklists without associated records', async () => {
            const mockChecklists = [
                createPlaybookChecklist('playbook_run_1', 3, 0),
                createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                delete_at: 0,
                order: index,
            }));

            await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // Remove associated records
            });

            // Mark the checklists for deletion by setting `delete_at` to a non-zero value
            mockChecklists.forEach((checklist) => {
                checklist.delete_at = 1620000005000;
            });

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // No associated records to remove
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockChecklists.length); // All checklists should be processed
            expect(spyOnPrepareDestroy).not.toHaveBeenCalled(); // No associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should create checklists and process children', async () => {
            const mockChecklists = [
                createPlaybookChecklist('playbook_run_1', 3, 0),
                createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                delete_at: 0,
                order: index,
            }));

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
            const spyOnHandleChecklistItem = jest.spyOn(operator, 'handlePlaybookChecklistItem');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                processChildren: true, // Process associated checklist items
            });

            // Calculate the expected total number of processed records
            const totalChecklists = mockChecklists.length;
            const totalChecklistItems = mockChecklists.reduce((count, checklist) => count + checklist.items.length, 0);
            const expectedTotalRecords = totalChecklists + totalChecklistItems;

            // Assertions
            expect(result).toBeDefined();
            expect(result.length).toBe(expectedTotalRecords); // All checklists and items should be processed
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(2); // Checklists should be prepared
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once
            expect(spyOnHandleChecklistItem).toHaveBeenCalledTimes(1); // Checklist items should be processed

            const {database} = operator;

            // Verify that the checklist table contains the created checklists
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(totalChecklists);

            // Verify that the checklist_item table contains the created items
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(totalChecklistItems);
        });

        it('should delete checklists with associated records', async () => {
            const mockChecklists = [
                createPlaybookChecklist('playbook_run_1', 3, 0),
                createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                delete_at: 0,
                order: index,
            }));

            await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // Remove associated records
            });

            // Mark the checklists for deletion by setting `delete_at` to a non-zero value
            mockChecklists.forEach((checklist) => {
                checklist.delete_at = 1620000005000;
            });

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                removeAssociatedRecords: true, // Remove associated records
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockChecklists.length); // All checklists should be processed
            expect(spyOnPrepareDestroy).toHaveBeenCalledTimes(1); // Associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should handle checklists with a combination of flags', async () => {
            const mockChecklists = [
                createPlaybookChecklist('playbook_run_1', 3, 0),
                createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                delete_at: 0,
                order: index,
            }));

            await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // Remove associated records
            });

            // Mark one of the checklists for deletion
            mockChecklists[0].delete_at = 1620000005000;

            jest.clearAllMocks();
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnHandleChecklistItem = jest.spyOn(operator, 'handlePlaybookChecklistItem');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false, // Only prepare records, do not save to the database
                processChildren: true, // Process associated checklist items
                removeAssociatedRecords: true, // Remove associated records for deleted checklists
            });

            // Assertions
            expect(result).toBeDefined();

            // Verify that prepareRecords was called for the checklists
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(2);

            // Verify that prepareDestroyPermanentlyChildrenAssociatedRecords was called for the deleted checklist
            expect(spyOnPrepareDestroy).toHaveBeenCalledTimes(1);

            // Verify that handlePlaybookChecklistItem was called to process children
            expect(spyOnHandleChecklistItem).toHaveBeenCalledTimes(1);

            // Verify that batchRecords was not called since prepareRecordsOnly is true
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);

            const {database} = operator;

            // Verify that the checklist table still contains the original checklists since records were only prepared
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBeGreaterThan(0); // No records should be saved

            const mockedDeleted = mockChecklists[0];
            const deletedCheckListIds = new Set(mockedDeleted.items?.map((checklist) => checklist.id));
            const deletedChecklists = checklistRecords.filter((checklist) => deletedCheckListIds.has(checklist.id));
            expect(deletedChecklists.length).toBe(0); // No records should be saved

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBeGreaterThan(0);

            const deletedCheckListItemsIds = new Set(mockedDeleted.items?.map((checklist) => checklist.id));
            const deletedChecklistItems = checklistItemRecords.filter((checklist) => deletedCheckListItemsIds.has(checklist.id));
            expect(deletedChecklistItems.length).toBe(0); // No records should be saved
        });
    });

    describe('handlePlaybookChecklistItem', () => {
        it('should return an empty array if items is undefined or empty', async () => {
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

            const result = await operator.handlePlaybookChecklistItem({
                items: undefined,
                prepareRecordsOnly: true,
            });

            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();
        });

        it('should process checklist items correctly', async () => {
            const mockItems = [
                createPlaybookItem('checklist_1', 0),
                createPlaybookItem('checklist_1', 1),
            ].map<PlaybookChecklistItemWithChecklist>((item, index) => ({
                ...item,
                checklist_id: 'checklist_1',
                delete_at: 0,
                order: index,
            }));

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: false,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockItems.length);
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
        });

        it('should delete checklist items', async () => {
            const mockItems = [
                createPlaybookItem('checklist_1', 0),
                createPlaybookItem('checklist_1', 1),
            ].map<PlaybookChecklistItemWithChecklist>((item, index) => ({
                ...item,
                checklist_id: 'checklist_1',
                delete_at: 0,
                order: index,
            }));

            await operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: false,
            });

            // Mark the items for deletion by setting `delete_at` to a non-zero value
            mockItems.forEach((item) => {
                item.delete_at = 1620000005000;
            });

            jest.clearAllMocks();

            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: false,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockItems.length); // All items should be processed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should handle checklist items with prepareRecordsOnly flag', async () => {
            const mockItems = [
                createPlaybookItem('checklist_1', 0),
                createPlaybookItem('checklist_1', 1),
            ].map<PlaybookChecklistItemWithChecklist>((item, index) => ({
                ...item,
                checklist_id: 'checklist_1',
                delete_at: 0,
                order: index,
            }));

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: true, // Only prepare records, do not save to the database
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockItems.length); // All items should be processed
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            expect(spyOnBatchOperation).not.toHaveBeenCalled(); // No batch operation should be performed

            const {database} = operator;

            // Verify that the checklist_item table is still empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });
    });
});
