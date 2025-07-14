// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import * as dbUtils from '@database/operator/utils/general';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

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

            let result = await operator.handlePlaybookRun({
                runs: undefined,
                prepareRecordsOnly: true,
                removeAssociatedRecords: false,
            });

            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();

            result = await operator.handlePlaybookRun({
                runs: [],
                prepareRecordsOnly: true,
                removeAssociatedRecords: false,
            });

            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();
        });

        it('should process runs correctly', async () => {
            const mockRuns = TestHelper.createPlaybookRuns(2, 2, 3);

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

        it('should NOT delete runs newly marked as ended', async () => {
            const mockRuns = TestHelper.createPlaybookRuns(2, 2, 3);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // Remove associated records
                keepFinishedRuns: false,
            });

            // Mark the runs for deletion by setting `end_at` to a non-zero value
            mockRuns.forEach((run) => {
                run.end_at = 1620000005000;
                run.update_at = run.update_at + 1;
            });

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // No associated records to remove
                keepFinishedRuns: false,
            });

            expect(result).toBeDefined();

            expect(result.length).toBe(mockRuns.length); // All runs should be processed
            expect(spyOnPrepareDestroy).not.toHaveBeenCalled(); // No associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the playbook_run table is empty
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(2);

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should delete runs previously ended and keep the last 5', async () => {
            const mockRuns = TestHelper.createPlaybookRuns(8, 2, 3);

            // Mark the runs for deletion by setting `end_at` to a non-zero value
            mockRuns.forEach((run) => {
                run.end_at = 1620000005000;
            });

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // Remove associated records
                keepFinishedRuns: false,
            });

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false, // No associated records to remove
                keepFinishedRuns: false,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(3); // Returns the 3 deleted runs
            expect(spyOnPrepareDestroy).not.toHaveBeenCalled(); // No associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the playbook_run table is empty
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(5);

            // Verify that the checklist table is empty
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(0);

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(0);
        });

        it('should create runs and process children', async () => {
            const mockRuns = TestHelper.createPlaybookRuns(2, 2, 3);

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
            const mockRuns = TestHelper.createPlaybookRuns(8, 2, 3);

            // Mark the runs for deletion by setting `end_at` to a non-zero value
            mockRuns.forEach((run, index) => {
                run.end_at = 1620000005000 + index;
            });

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            // Calculate the expected total number of processed records
            const runsThatWillBeDeleted = mockRuns.sort((a, b) => b.end_at - a.end_at).slice(-3);
            const totalRuns = runsThatWillBeDeleted.length; // 3 runs will be deleted
            const allChecklists = runsThatWillBeDeleted.reduce<PlaybookChecklist[]>((checklists, run) => {
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

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: true, // Remove associated records
                keepFinishedRuns: false,
            });

            // Assertions
            expect(result).toBeDefined();
            expect(result.length).toBe(expectedTotalRecords); // All runs should be processed
            expect(spyOnPrepareDestroy).toHaveBeenCalledTimes(1); // Associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1); // Batch operation should be called once

            const {database} = operator;

            // Verify that the playbook_run table has 5 finished runs
            const finishedNotDeleted = mockRuns.sort((a, b) => b.end_at - a.end_at).slice(0, 5);
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(finishedNotDeleted.length);

            // Verify that the checklist only contains the checklists of the remaining runs
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            const remainingChecklists = finishedNotDeleted.reduce<PlaybookChecklist[]>((checklists, run) => {
                if (run.checklists.length) {
                    checklists.push(...run.checklists);
                }
                return checklists;
            }, []);
            expect(checklistRecords.length).toBe(remainingChecklists.length);

            // Verify that the checklist_item only contains items of the remaining runs
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            const remainingChecklistItems = remainingChecklists.reduce<PlaybookChecklistItem[]>((items, checklist) => {
                if (checklist.items.length) {
                    items.push(...checklist.items);
                }
                return items;
            }, []);
            expect(checklistItemRecords.length).toBe(remainingChecklistItems.length);
        });

        it('should Keep all finished runs', async () => {
            const mockRuns = TestHelper.createPlaybookRuns(8, 2, 3);

            // Mark the runs for deletion by setting `end_at` to a non-zero value
            mockRuns.forEach((run, index) => {
                run.end_at = 1620000005000 + index;
            });

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
                keepFinishedRuns: false,
            });

            // Calculate the expected total number of processed records
            const allChecklists = mockRuns.reduce<PlaybookChecklist[]>((checklists, run) => {
                if (run.checklists.length) {
                    checklists.push(...run.checklists);
                }
                return checklists;
            }, []);
            const allChecklistItems = allChecklists.reduce<PlaybookChecklistItem[]>((items, checklist) => {
                if (checklist.items.length) {
                    items.push(...checklist.items);
                }
                return items;
            }, []);

            jest.clearAllMocks();

            const spyOnPrepareDestroy = jest.spyOn(dbUtils, 'prepareDestroyPermanentlyChildrenAssociatedRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: true, // Remove associated records
                keepFinishedRuns: true,
            });

            // Assertions
            expect(result).toBeDefined();
            expect(result.length).toBe(0); // No runs should be processed
            expect(spyOnPrepareDestroy).toHaveBeenCalledTimes(0); // Associated records should be removed
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(0); // Batch operation should be called once

            const {database} = operator;

            // Verify that the playbook_run table has all the finished runs
            const playbookRunRecords = await database.get(PLAYBOOK_RUN).query().fetch();
            expect(playbookRunRecords.length).toBe(mockRuns.length);

            // Verify that the checklist only contains the checklists of the remaining runs
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBe(allChecklists.length);

            // Verify that the checklist_item only contains items of the remaining runs
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBe(allChecklistItems.length);
        });
    });

    describe('handlePlaybookChecklist', () => {
        it('should return an empty array if checklists is undefined or empty', async () => {
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

            const result = await operator.handlePlaybookChecklist({
                checklists: undefined,
                prepareRecordsOnly: false,
            });

            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();
        });

        it('should process checklists correctly', async () => {
            const mockChecklists = [
                TestHelper.createPlaybookChecklist('playbook_run_1', 3, 0),
                TestHelper.createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                order: index,
            }));

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
            });

            expect(result).toBeDefined();
            expect(result.length).toBe(mockChecklists.length);
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
        });

        it('should create checklists and process children', async () => {
            const mockChecklists = [
                TestHelper.createPlaybookChecklist('playbook_run_1', 3, 0),
                TestHelper.createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
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

        it('should handle checklists with a combination of flags', async () => {
            const mockChecklists = [
                TestHelper.createPlaybookChecklist('playbook_run_1', 3, 0),
                TestHelper.createPlaybookChecklist('playbook_run_1', 2, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: 'playbook_run_1',
                order: index,
            }));

            await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
            });

            jest.clearAllMocks();
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
            const spyOnHandleChecklistItem = jest.spyOn(operator, 'handlePlaybookChecklistItem');

            const result = await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false, // Only prepare records, do not save to the database
                processChildren: true, // Process associated checklist items
            });

            // Assertions
            expect(result).toBeDefined();

            // Verify that prepareRecords was called for the checklists
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);

            // Verify that handlePlaybookChecklistItem was called to process children
            expect(spyOnHandleChecklistItem).toHaveBeenCalledTimes(1);

            // Verify that batchRecords was not called since prepareRecordsOnly is true
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);

            const {database} = operator;

            // Verify that the checklist table still contains the original checklists since records were only prepared
            const checklistRecords = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
            expect(checklistRecords.length).toBeGreaterThan(0); // No records should be saved

            // Verify that the checklist_item table is empty
            const checklistItemRecords = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
            expect(checklistItemRecords.length).toBeGreaterThan(0);
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
                TestHelper.createPlaybookItem('checklist_1', 0),
                TestHelper.createPlaybookItem('checklist_1', 1),
            ].map<PartialChecklistItem>((item, index) => ({
                ...item,
                checklist_id: 'checklist_1',
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

        it('should handle checklist items with prepareRecordsOnly flag', async () => {
            const mockItems = [
                TestHelper.createPlaybookItem('checklist_1', 0),
                TestHelper.createPlaybookItem('checklist_1', 1),
            ].map<PartialChecklistItem>((item, index) => ({
                ...item,
                checklist_id: 'checklist_1',
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
