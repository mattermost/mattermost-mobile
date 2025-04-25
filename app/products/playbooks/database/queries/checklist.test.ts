// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {createPlaybookChecklist, createPlaybookItem} from '@playbooks/database/operators/handlers/index.test';

import {
    queryPlaybookChecklistByRun,
    getPlaybookChecklistById,
    observePlaybookChecklistById,
    observePlaybookChecklistsByRun,
    observePlaybookChecklistProgress,
} from './checklist';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Checklist Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['checklist.test.com']);
        operator = DatabaseManager.serverDatabases['checklist.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('checklist.test.com');
    });

    describe('queryPlaybookChecklistByRun', () => {
        it('should query checklists by runId and sort by order ascending', async () => {
            const runId = 'run123';
            const mockChecklists = [
                createPlaybookChecklist(runId, 0, 1), // Checklist with order 1
                createPlaybookChecklist(runId, 0, 0), // Checklist with order 0
            ].map((checklist, index) => ({
                ...checklist,
                run_id: runId,
                order: index,
                delete_at: 0,
            })).reverse();

            await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
            });

            const result = queryPlaybookChecklistByRun(operator.database, runId);
            const fetchedChecklists = await result.fetch();

            expect(fetchedChecklists.length).toBe(2);
            expect(fetchedChecklists[0].id).toBe(mockChecklists[1].id); // Sorted by order ascending
            expect(fetchedChecklists[1].id).toBe(mockChecklists[0].id);
        });
    });

    describe('getPlaybookChecklistById', () => {
        it('should return a checklist if found', async () => {
            const mockChecklist = {
                ...createPlaybookChecklist('run123', 0, 0),
                run_id: 'run123',
                order: 0,
                delete_at: 0,
            };

            await operator.handlePlaybookChecklist({
                checklists: [mockChecklist],
                prepareRecordsOnly: false,
            });

            const result = await getPlaybookChecklistById(operator.database, mockChecklist.id);

            expect(result).toBeDefined();
            expect(result!.id).toBe(mockChecklist.id);
        });

        it('should return undefined if checklist is not found', async () => {
            const result = await getPlaybookChecklistById(operator.database, 'nonexistent');

            expect(result).toBeUndefined();
        });
    });

    describe('observePlaybookChecklistById', () => {
        it('should observe a checklist by id', (done) => {
            const mockChecklist = {
                ...createPlaybookChecklist('run123', 0, 0),
                run_id: 'run123',
                order: 0,
                delete_at: 0,
            };

            operator.handlePlaybookChecklist({
                checklists: [mockChecklist],
                prepareRecordsOnly: false,
            }).then(() => {
                const observable = observePlaybookChecklistById(operator.database, mockChecklist.id);

                observable.subscribe((checklist) => {
                    expect(checklist).toBeDefined();
                    expect(checklist!.id).toBe(mockChecklist.id);
                    done();
                });
            });
        });

        it('should return undefined if checklist is not found', (done) => {
            const observable = observePlaybookChecklistById(operator.database, 'nonexistent');

            observable.subscribe((checklist) => {
                expect(checklist).toBeUndefined();
                done();
            });
        });
    });

    describe('observePlaybookChecklistsByRun', () => {
        it('should observe checklists by runId', (done) => {
            const runId = 'run123';
            const mockChecklists = [
                createPlaybookChecklist(runId, 0, 1), // Checklist with order 1
                createPlaybookChecklist(runId, 0, 0), // Checklist with order 0
            ].map((checklist, index) => ({
                ...checklist,
                run_id: runId,
                order: index,
                delete_at: 0,
            })).reverse();

            operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
            }).then(() => {
                const observable = observePlaybookChecklistsByRun(operator.database, runId);

                observable.subscribe((checklists) => {
                    expect(checklists.length).toBe(2);
                    expect(checklists[0].id).toBe(mockChecklists[1].id); // Sorted by order ascending
                    expect(checklists[1].id).toBe(mockChecklists[0].id);
                    done();
                });
            });
        });
    });

    describe('observePlaybookChecklistProgress', () => {
        it('should calculate progress as 0 if no items exist', (done) => {
            const checklistId = 'checklist123';

            operator.handlePlaybookChecklistItem({
                items: [],
                prepareRecordsOnly: false,
            }).then(() => {
                const observable = observePlaybookChecklistProgress(operator.database, checklistId);

                observable.subscribe((progress) => {
                    expect(progress).toBe(0);
                    done();
                });
            });
        });

        it('should calculate progress percentage based on completed items', (done) => {
            const runId = 'run123';
            const mockChecklists = [
                createPlaybookChecklist(runId, 0, 9), // Checklist with order 1
            ].map((checklist, index) => ({
                ...checklist,
                run_id: runId,
                order: index,
                delete_at: 0,
            }));

            if (mockChecklists[0].items.length < 3) {
                const index = mockChecklists[0].items.length - 1;
                mockChecklists[0].items.push(
                    createPlaybookItem(mockChecklists[0].id, index + 1),
                    createPlaybookItem(mockChecklists[0].id, index + 2),
                    createPlaybookItem(mockChecklists[0].id, index + 3),
                );
            }
            const totalItems = mockChecklists[0].items.length;

            // mark only a third of items as completed
            mockChecklists[0].items.forEach((item, index) => {
                if (index < (totalItems * 2) / 3) {
                    item.state = 'closed';
                    item.completed_at = Date.now();
                }
            });

            operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
                processChildren: true,
            }).then(() => {
                const observable = observePlaybookChecklistProgress(operator.database, mockChecklists[0].id);

                observable.subscribe((progress) => {
                    expect(progress).toBeGreaterThan(0);
                    expect(progress).toBeLessThan(100.00);
                    done();
                });
            });
        });
    });
});
