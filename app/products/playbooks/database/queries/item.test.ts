// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    queryPlaybookChecklistItemsByChecklists,
    getPlaybookChecklistItemById,
} from './item';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Checklist Item Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['item.test.com']);
        operator = DatabaseManager.serverDatabases['item.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('item.test.com');
    });

    describe('queryPlaybookChecklistItemsByChecklist', () => {
        it('should query checklist items by checklistId', async () => {
            const checklistId = 'checklist123';
            const mockItems = [
                TestHelper.createPlaybookItem(checklistId, 0),
                TestHelper.createPlaybookItem(checklistId, 1),
            ].map((item) => ({
                ...item,
                checklist_id: checklistId,
            }));

            await operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: false,
            });

            const result = queryPlaybookChecklistItemsByChecklists(operator.database, [checklistId]);
            const fetchedItems = await result.fetch();

            expect(fetchedItems.length).toBe(2);
            const fetchedIds = fetchedItems.map((item) => item.id);
            expect(fetchedIds).toContain(mockItems[0].id);
            expect(fetchedIds).toContain(mockItems[1].id);
        });
    });

    describe('getPlaybookChecklistItemById', () => {
        it('should return a checklist item if found', async () => {
            const mockItem = {
                ...TestHelper.createPlaybookItem('checklist123', 0),
                checklist_id: 'checklist123',
            };

            await operator.handlePlaybookChecklistItem({
                items: [mockItem],
                prepareRecordsOnly: false,
            });

            const result = await getPlaybookChecklistItemById(operator.database, mockItem.id);

            expect(result).toBeDefined();
            expect(result!.id).toBe(mockItem.id);
        });

        it('should return undefined if checklist item is not found', async () => {
            const result = await getPlaybookChecklistItemById(operator.database, 'nonexistent');

            expect(result).toBeUndefined();
        });
    });
});
