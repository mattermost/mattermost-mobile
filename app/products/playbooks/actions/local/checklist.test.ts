// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPlaybookChecklistItemById} from '@playbooks/database/queries/item';
import TestHelper from '@test/test_helper';

import {updateChecklistItem} from './checklist';

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
