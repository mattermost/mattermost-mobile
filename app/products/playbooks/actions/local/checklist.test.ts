// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPlaybookChecklistById} from '@playbooks/database/queries/checklist';
import {getPlaybookChecklistItemById} from '@playbooks/database/queries/item';
import TestHelper from '@test/test_helper';

import {updateChecklistItem, setChecklistItemCommand, setAssignee, setDueDate, renameChecklist, deleteChecklistItem, updateChecklistItemTitleAndDescription} from './checklist';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('updateChecklistItem', () => {
    it('should handle not found database', async () => {
        const {error} = await updateChecklistItem('foo', 'itemid', 'in_progress');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle item not found', async () => {
        const {error} = await updateChecklistItem(serverUrl, 'nonexistent', 'in_progress');
        expect(error).toBe('Item not found');
    });

    it('should handle database write errors', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await updateChecklistItem(serverUrl, item.id, 'closed');
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should handle all valid checklist item states', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const validStates: ChecklistItemState[] = ['', 'in_progress', 'closed', 'skipped'];

        // Test each state
        const testPromises = validStates.map(async (state) => {
            const {data, error} = await updateChecklistItem(serverUrl, item.id, state);
            expect(error).toBeUndefined();
            expect(data).toBe(true);

            const updated = await getPlaybookChecklistItemById(operator.database, item.id);
            expect(updated).toBeDefined();
            expect(updated!.state).toBe(state);
        });

        await Promise.all(testPromises);
    });
});

describe('setChecklistItemCommand', () => {
    it('should handle not found database', async () => {
        const {error} = await setChecklistItemCommand('foo', 'itemid', '/test command');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle item not found', async () => {
        const {error} = await setChecklistItemCommand(serverUrl, 'nonexistent', '/test command');
        expect(error).toBe('Item not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await setChecklistItemCommand(serverUrl, item.id, '/test command');
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should set command successfully', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const testCommand = '/test command with parameters';
        const {data, error} = await setChecklistItemCommand(serverUrl, item.id, testCommand);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.command).toBe(testCommand);
    });

    it('should handle empty command string', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const {data, error} = await setChecklistItemCommand(serverUrl, item.id, '');
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.command).toBe('');
    });
});

describe('setAssignee', () => {
    it('should handle not found database', async () => {
        const {error} = await setAssignee('foo', 'itemid', 'user123');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle item not found', async () => {
        const {error} = await setAssignee(serverUrl, 'nonexistent', 'user123');
        expect(error).toBe('Item not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await setAssignee(serverUrl, item.id, 'user123');
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should successfully set assignee for existing item', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const assigneeId = 'user123';
        const {data, error} = await setAssignee(serverUrl, item.id, assigneeId);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.assigneeId).toBe(assigneeId);
    });

    it('should handle empty assignee ID', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const {data, error} = await setAssignee(serverUrl, item.id, '');
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.assigneeId).toBe('');
    });
});

describe('setDueDate', () => {
    it('should handle not found database', async () => {
        const {error} = await setDueDate('foo', 'itemid', 1234567890);
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle item not found', async () => {
        const {error} = await setDueDate(serverUrl, 'nonexistent', 1234567890);
        expect(error).toBe('Item not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await setDueDate(serverUrl, item.id, 1234567890);
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should set valid due date successfully', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const testDate = 1640995200000; // January 1, 2022 00:00:00 UTC
        const {data, error} = await setDueDate(serverUrl, item.id, testDate);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.dueDate).toBe(testDate);
    });

    it('should set due date to 0 when undefined is passed', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const {data, error} = await setDueDate(serverUrl, item.id, undefined);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.dueDate).toBe(0);
    });

    it('should set due date to 0 when no date parameter is passed', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const {data, error} = await setDueDate(serverUrl, item.id);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.dueDate).toBe(0);
    });

    it('should handle setting due date to 0 explicitly', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const {data, error} = await setDueDate(serverUrl, item.id, 0);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.dueDate).toBe(0);
    });
});

describe('renameChecklist', () => {
    it('should handle not found database', async () => {
        const {error} = await renameChecklist('foo', 'checklistid', 'New Title');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle checklist not found', async () => {
        const {error} = await renameChecklist(serverUrl, 'nonexistent', 'New Title');
        expect(error).toBe('Checklist not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const runId = 'runid';
        const checklist = {
            ...TestHelper.createPlaybookChecklist(runId, 0, 0),
            run_id: runId,
            order: 0,
        };
        await operator.handlePlaybookChecklist({checklists: [checklist], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await renameChecklist(serverUrl, checklist.id, 'New Title');
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should rename checklist successfully', async () => {
        const runId = 'runid';
        const checklist = {
            ...TestHelper.createPlaybookChecklist(runId, 0, 0),
            run_id: runId,
            order: 0,
        };
        await operator.handlePlaybookChecklist({checklists: [checklist], prepareRecordsOnly: false});

        const newTitle = 'Updated Checklist Title';
        const {data, error} = await renameChecklist(serverUrl, checklist.id, newTitle);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistById(operator.database, checklist.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(newTitle);
    });

    it('should reject empty title string', async () => {
        const runId = 'runid';
        const checklist = {
            ...TestHelper.createPlaybookChecklist(runId, 0, 0),
            run_id: runId,
            order: 0,
        };
        await operator.handlePlaybookChecklist({checklists: [checklist], prepareRecordsOnly: false});

        const originalTitle = checklist.title;
        const {data, error} = await renameChecklist(serverUrl, checklist.id, '');
        expect(error).toBe('Title cannot be empty or whitespace-only');
        expect(data).toBeUndefined();

        // Verify the title was not changed
        const updated = await getPlaybookChecklistById(operator.database, checklist.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(originalTitle);
    });

    it('should reject whitespace-only title', async () => {
        const runId = 'runid';
        const checklist = {
            ...TestHelper.createPlaybookChecklist(runId, 0, 0),
            run_id: runId,
            order: 0,
        };
        await operator.handlePlaybookChecklist({checklists: [checklist], prepareRecordsOnly: false});

        const originalTitle = checklist.title;
        const whitespaceTitle = '   ';
        const {data, error} = await renameChecklist(serverUrl, checklist.id, whitespaceTitle);
        expect(error).toBe('Title cannot be empty or whitespace-only');
        expect(data).toBeUndefined();

        // Verify the title was not changed
        const updated = await getPlaybookChecklistById(operator.database, checklist.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(originalTitle);
    });

    it('should handle very long titles', async () => {
        const runId = 'runid';
        const checklist = {
            ...TestHelper.createPlaybookChecklist(runId, 0, 0),
            run_id: runId,
            order: 0,
        };
        await operator.handlePlaybookChecklist({checklists: [checklist], prepareRecordsOnly: false});

        const longTitle = 'A'.repeat(300); // 300 characters
        const {data, error} = await renameChecklist(serverUrl, checklist.id, longTitle);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistById(operator.database, checklist.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(longTitle);
    });

    it('should trim leading and trailing whitespace from title', async () => {
        const runId = 'runid';
        const checklist = {
            ...TestHelper.createPlaybookChecklist(runId, 0, 0),
            run_id: runId,
            order: 0,
        };
        await operator.handlePlaybookChecklist({checklists: [checklist], prepareRecordsOnly: false});

        const titleWithSpaces = '  Updated Checklist Title  ';
        const {data, error} = await renameChecklist(serverUrl, checklist.id, titleWithSpaces);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistById(operator.database, checklist.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe('Updated Checklist Title');
    });
});

describe('deleteChecklistItem', () => {
    it('should handle not found database', async () => {
        const {error} = await deleteChecklistItem('foo', 'itemid');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle item not found', async () => {
        const {error} = await deleteChecklistItem(serverUrl, 'nonexistent');
        expect(error).toBe('Item not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await deleteChecklistItem(serverUrl, item.id);
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should delete checklist item successfully', async () => {
        const checklistId = 'checklistid';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        // Verify item exists before deletion
        const beforeDelete = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(beforeDelete).toBeDefined();
        expect(beforeDelete!.id).toBe(item.id);

        const {data, error} = await deleteChecklistItem(serverUrl, item.id);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify item is deleted
        const afterDelete = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(afterDelete).toBeUndefined();
    });

    it('should delete checklist item with different states', async () => {
        const checklistId = 'checklistid';
        const states: ChecklistItemState[] = ['', 'in_progress', 'closed', 'skipped'];

        const testPromises = states.map(async (state) => {
            const item = TestHelper.createPlaybookItem(checklistId, 0);
            item.state = state;
            await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

            const {data, error} = await deleteChecklistItem(serverUrl, item.id);
            expect(error).toBeUndefined();
            expect(data).toBe(true);

            const deleted = await getPlaybookChecklistItemById(operator.database, item.id);
            expect(deleted).toBeUndefined();
        });

        await Promise.all(testPromises);
    });
});

describe('updateChecklistItemTitleAndDescription', () => {
    it('should handle not found database', async () => {
        const {error} = await updateChecklistItemTitleAndDescription('foo', 'itemid', 'New Title', 'New Description');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle item not found', async () => {
        const {error} = await updateChecklistItemTitleAndDescription(serverUrl, 'nonexistent', 'New Title', 'New Description');
        expect(error).toBe('Item not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const checklistId = 'updatetitledesc-checklist-write-error';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await updateChecklistItemTitleAndDescription(serverUrl, item.id, 'New Title', 'New Description');
        expect(error).toBeTruthy();

        operator.database.write = originalWrite;
    });

    it('should update title and description successfully', async () => {
        const checklistId = 'updatetitledesc-checklist-success';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const newTitle = 'Updated Item Title';
        const newDescription = 'Updated Item Description';
        const {data, error} = await updateChecklistItemTitleAndDescription(serverUrl, item.id, newTitle, newDescription);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(newDescription);
    });

    it('should update with empty description', async () => {
        const checklistId = 'updatetitledesc-checklist-empty-desc';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const newTitle = 'Updated Item Title';
        const {data, error} = await updateChecklistItemTitleAndDescription(serverUrl, item.id, newTitle, '');
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe('');
    });

    it('should update with undefined description', async () => {
        const checklistId = 'updatetitledesc-checklist-undef-desc';
        const item = TestHelper.createPlaybookItem(checklistId, 0);
        await operator.handlePlaybookChecklistItem({items: [{...item, checklist_id: checklistId}], prepareRecordsOnly: false});

        const newTitle = 'Updated Item Title';
        const {data, error} = await updateChecklistItemTitleAndDescription(serverUrl, item.id, newTitle, undefined);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updated = await getPlaybookChecklistItemById(operator.database, item.id);
        expect(updated).toBeDefined();
        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe('');
    });
});
