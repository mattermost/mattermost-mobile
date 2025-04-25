// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {createPlaybookItem} from '@playbooks/database/operators/handlers/index.test';

import {
    queryPlaybookChecklistItemsByChecklist,
    getPlaybookChecklistItemById,
    observePlaybookChecklistItemById,
    observePlaybookChecklistItemssByChecklist,
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
        it('should query checklist items by checklistId and sort by order ascending', async () => {
            const checklistId = 'checklist123';
            const mockItems = [
                createPlaybookItem(checklistId, 1), // Item with order 1
                createPlaybookItem(checklistId, 0), // Item with order 0
            ].map((item, index) => ({
                ...item,
                checklist_id: checklistId,
                order: index,
                delete_at: 0,
            }));

            await operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: false,
            });

            const result = queryPlaybookChecklistItemsByChecklist(operator.database, checklistId);
            const fetchedItems = await result.fetch();

            expect(fetchedItems.length).toBe(2);
            expect(fetchedItems[0].id).toBe(mockItems[0].id);
            expect(fetchedItems[1].id).toBe(mockItems[1].id);
        });
    });

    describe('getPlaybookChecklistItemById', () => {
        it('should return a checklist item if found', async () => {
            const mockItem = {
                ...createPlaybookItem('checklist123', 0),
                checklist_id: 'checklist123',
                order: 0,
                delete_at: 0,
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

    describe('observePlaybookChecklistItemById', () => {
        it('should observe a checklist item by id', (done) => {
            const mockItem = {
                ...createPlaybookItem('checklist123', 0),
                checklist_id: 'checklist123',
                order: 0,
                delete_at: 0,
            };

            operator.handlePlaybookChecklistItem({
                items: [mockItem],
                prepareRecordsOnly: false,
            }).then(() => {
                const observable = observePlaybookChecklistItemById(operator.database, mockItem.id);

                observable.subscribe((item) => {
                    expect(item).toBeDefined();
                    expect(item!.id).toBe(mockItem.id);
                    done();
                });
            });
        });

        it('should return undefined if checklist item is not found', (done) => {
            const observable = observePlaybookChecklistItemById(operator.database, 'nonexistent');

            observable.subscribe((item) => {
                expect(item).toBeUndefined();
                done();
            });
        });
    });

    describe('observePlaybookChecklistItemssByChecklist', () => {
        it('should observe checklist items by checklistId', (done) => {
            const checklistId = 'checklist123';
            const mockItems = [
                createPlaybookItem(checklistId, 1), // Item with order 1
                createPlaybookItem(checklistId, 0), // Item with order 0
            ].map((item, index) => ({
                ...item,
                checklist_id: checklistId,
                order: index,
                delete_at: 0,
            }));

            operator.handlePlaybookChecklistItem({
                items: mockItems,
                prepareRecordsOnly: false,
            }).then(() => {
                const observable = observePlaybookChecklistItemssByChecklist(operator.database, checklistId);

                observable.subscribe((items) => {
                    expect(items.length).toBe(2);
                    expect(items[0].id).toBe(mockItems[0].id);
                    expect(items[1].id).toBe(mockItems[1].id);
                    done();
                });
            });
        });
    });
});
