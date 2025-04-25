// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {createPlaybookItem, createPlaybookRuns} from '@playbooks/database/operators/handlers/index.test';

import {
    queryPlaybookRunsPerChannel,
    getPlaybookRunById,
    observePlaybookRunById,
    observePlaybookRunsPerChannel,
    observePlaybookRunProgress,
} from './run';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Playbook Run Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['playbookRun.test.com']);
        operator = DatabaseManager.serverDatabases['playbookRun.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('playbookRun.test.com');
    });

    describe('queryPlaybookRunsPerChannel', () => {
        it('should query playbook runs for a channel without finished status', async () => {
            const channelId = 'channel1';
            const mockRuns = createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc

            console.log('MOCK RUNS', mockRuns.map((run) => run.id));
            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = queryPlaybookRunsPerChannel(operator.database, channelId);
            const fetchedRuns = await result.fetch();
            console.log('FETCHED', fetchedRuns.map((run) => run.id));

            expect(fetchedRuns.length).toBe(2);
            expect(fetchedRuns[0].id).toBe(mockRuns[0].id);
            expect(fetchedRuns[1].id).toBe(mockRuns[1].id);
        });

        it('should query playbook runs for a channel with finished status', async () => {
            const channelId = 'channel2';
            const mockRuns = createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = queryPlaybookRunsPerChannel(operator.database, channelId, true);
            const fetchedRuns = await result.fetch();

            expect(fetchedRuns.length).toBe(1);
            expect(fetchedRuns[0].id).toBe(mockRuns[0].id); // Only the finished run
        });

        it('should query playbook runs for a channel with unfinished status', async () => {
            const channelId = 'channel3';
            const mockRuns = createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = queryPlaybookRunsPerChannel(operator.database, channelId, false);
            const fetchedRuns = await result.fetch();

            expect(fetchedRuns.length).toBe(1);
            expect(fetchedRuns[0].id).toBe(mockRuns[1].id); // Only the unfinished run
        });
    });

    describe('getPlaybookRunById', () => {
        it('should return the playbook run if found', async () => {
            const mockRuns = createPlaybookRuns(1, 0, 0);
            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = await getPlaybookRunById(operator.database, mockRuns[0].id);

            expect(result).toBeDefined();
            expect(result!.id).toBe(mockRuns[0].id);
        });

        it('should return undefined if the playbook run is not found', async () => {
            const result = await getPlaybookRunById(operator.database, 'nonexistent_run');

            expect(result).toBeUndefined();
        });
    });

    describe('observePlaybookRunById', () => {
        it('should observe the playbook run if found', (done) => {
            const mockRuns = createPlaybookRuns(1, 0, 0);
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const observable = observePlaybookRunById(operator.database, mockRuns[0].id);

            observable.subscribe((run) => {
                expect(run).toBeDefined();
                expect(run!.id).toBe(mockRuns[0].id);
                done();
            });
        });

        it('should return undefined if the playbook run is not found', (done) => {
            const observable = observePlaybookRunById(operator.database, 'nonexistent_run');

            observable.subscribe((run) => {
                expect(run).toBeUndefined();
                done();
            });
        });
    });

    describe('observePlaybookRunsPerChannel', () => {
        it('should observe playbook runs for a channel without finished status', (done) => {
            const channelId = 'channel4';
            const mockRuns = createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const observable = observePlaybookRunsPerChannel(operator.database, channelId);

            observable.subscribe((runs) => {
                expect(runs.length).toBe(2);
                expect(runs[0].id).toBe(mockRuns[0].id);
                expect(runs[1].id).toBe(mockRuns[1].id);
                done();
            });
        });

        it('should observe playbook runs for a channel with finished status', (done) => {
            const channelId = 'channel5';
            const mockRuns = createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const observable = observePlaybookRunsPerChannel(operator.database, channelId, true);

            observable.subscribe((runs) => {
                expect(runs.length).toBe(1);
                expect(runs[0].id).toBe(mockRuns[0].id); // Only the finished run
                done();
            });
        });

        it('should observe playbook runs for a channel with unfinished status', (done) => {
            const channelId = 'channel6';
            const mockRuns = createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const observable = observePlaybookRunsPerChannel(operator.database, channelId, false);

            observable.subscribe((runs) => {
                expect(runs.length).toBe(1);
                expect(runs[0].id).toBe(mockRuns[1].id); // Only the unfinished run
                done();
            });
        });
    });

    describe('observePlaybookRunProgress', () => {
        it('should return 0 when there are no checklist', (done) => {
            const mockRuns = createPlaybookRuns(1, 0, 0);
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

            observable.subscribe((progress) => {
                expect(progress).toBe(0);
                done();
            });
        });

        it('should return 0 when there are no checklist items', (done) => {
            const mockRuns = createPlaybookRuns(1, 1, 0);
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

            observable.subscribe((progress) => {
                expect(progress).toBe(0);
                done();
            });
        });

        it('should return 100 when all checklist items are completed', (done) => {
            const mockRuns = createPlaybookRuns(1, 1, 2);
            mockRuns[0].checklists[0].items.forEach((item) => {
                item.state = 'done';
                item.completed_at = Date.now();
            });
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

            observable.subscribe((progress) => {
                expect(progress).toBe(100.00);
                done();
            });
        });

        it('should return correct progress when some checklist items are completed', (done) => {
            const mockRuns = createPlaybookRuns(1, 1, 9);
            if (mockRuns[0].checklists[0].items.length < 3) {
                const index = mockRuns[0].checklists[0].items.length - 1;
                mockRuns[0].checklists[0].items.push(
                    createPlaybookItem(mockRuns[0].checklists[0].id, index + 1),
                    createPlaybookItem(mockRuns[0].checklists[0].id, index + 2),
                    createPlaybookItem(mockRuns[0].checklists[0].id, index + 3),
                );
            }
            const totalItems = mockRuns[0].checklists[0].items.length;

            // mark only a third of items as completed
            mockRuns[0].checklists[0].items.forEach((item, index) => {
                if (index < (totalItems * 2) / 3) {
                    item.state = 'closed';
                    item.completed_at = Date.now();
                }
            });

            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

            observable.subscribe((progress) => {
                console.log('PROGRESS', progress);
                expect(progress).toBeGreaterThan(0);
                expect(progress).toBeLessThan(100.00);
                done();
            });
        });

        it('should return 0 when all checklist items are open', (done) => {
            const mockRuns = createPlaybookRuns(1, 1, 2);

            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

            observable.subscribe((progress) => {
                expect(progress).toBe(0);
                done();
            });
        });
    });
});
