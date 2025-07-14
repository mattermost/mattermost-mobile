// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    queryPlaybookChecklistByRun,
    getPlaybookChecklistById,
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
        it('should query checklists by runId', async () => {
            const runId = 'run123';
            const mockChecklists = [
                TestHelper.createPlaybookChecklist(runId, 0, 0),
                TestHelper.createPlaybookChecklist(runId, 0, 1),
            ].map((checklist, index) => ({
                ...checklist,
                run_id: runId,
                order: index,
            })).reverse();

            await operator.handlePlaybookChecklist({
                checklists: mockChecklists,
                prepareRecordsOnly: false,
            });

            const result = queryPlaybookChecklistByRun(operator.database, runId);
            const fetchedChecklists = await result.fetch();

            expect(fetchedChecklists.length).toBe(2);
            expect(fetchedChecklists).toContainEqual(expect.objectContaining({id: mockChecklists[0].id}));
            expect(fetchedChecklists).toContainEqual(expect.objectContaining({id: mockChecklists[1].id}));
        });
    });

    describe('getPlaybookChecklistById', () => {
        it('should return a checklist if found', async () => {
            const mockChecklist = {
                ...TestHelper.createPlaybookChecklist('run123', 0, 0),
                run_id: 'run123',
                order: 0,
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
});
