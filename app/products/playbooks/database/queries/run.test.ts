// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {filter} from 'rxjs/operators';

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    queryPlaybookRunsPerChannel,
    getPlaybookRunById,
    observePlaybookRunById,
    observePlaybookRunsPerChannel,
    observePlaybookRunProgress,
    observePlaybookRunParticipants,
} from './run';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Subscription} from 'rxjs';

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
            const mockRuns = TestHelper.createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = queryPlaybookRunsPerChannel(operator.database, channelId);
            const fetchedRuns = await result.fetch();

            expect(fetchedRuns.length).toBe(2);
            expect(fetchedRuns[0].id).toBe(mockRuns[0].id);
            expect(fetchedRuns[1].id).toBe(mockRuns[1].id);
        });

        it('should query playbook runs for a channel with finished status', async () => {
            const channelId = 'channel2';
            const mockRuns = TestHelper.createPlaybookRuns(2, 0, 0).map((run, index) => ({
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
            const mockRuns = TestHelper.createPlaybookRuns(2, 0, 0).map((run, index) => ({
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
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);
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
        let sub: Subscription | null = null;
        afterEach(() => {
            if (!sub?.closed) {
                sub?.unsubscribe();
            }
        });

        it('should observe the playbook run if found', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunById(operator.database, mockRuns[0].id);

                sub = observable.subscribe((run) => {
                    expect(run).toBeDefined();
                    expect(run!.id).toBe(mockRuns[0].id);
                    sub?.unsubscribe();
                    done();
                });
            });
        });

        it('should return undefined if the playbook run is not found', (done) => {
            const observable = observePlaybookRunById(operator.database, 'nonexistent_run');

            sub = observable.subscribe((run) => {
                expect(run).toBeUndefined();
                done();
            });
        });
    });

    describe('observePlaybookRunsPerChannel', () => {
        let sub: Subscription | null = null;
        afterEach(() => {
            if (!sub?.closed) {
                sub?.unsubscribe();
            }
        });

        it('should observe playbook runs for a channel without finished status', (done) => {
            const channelId = 'channel4';
            const mockRuns = TestHelper.createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunsPerChannel(operator.database, channelId);

                sub = observable.subscribe((runs) => {
                    expect(runs.length).toBe(2);
                    expect(runs[0].id).toBe(mockRuns[0].id);
                    expect(runs[1].id).toBe(mockRuns[1].id);
                    done();
                });
            });
        });

        it('should observe playbook runs for a channel with finished status', (done) => {
            const channelId = 'channel5';
            const mockRuns = TestHelper.createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunsPerChannel(operator.database, channelId, true);

                sub = observable.subscribe((runs) => {
                    expect(runs.length).toBe(1);
                    expect(runs[0].id).toBe(mockRuns[0].id); // Only the finished run
                    done();
                });
            });
        });

        it('should observe playbook runs for a channel with unfinished status', (done) => {
            const channelId = 'channel6';
            const mockRuns = TestHelper.createPlaybookRuns(2, 0, 0).map((run, index) => ({
                ...run,
                channel_id: channelId,
                end_at: index === 0 ? 0 : 1620000000000, // First run is not finished, second is finished
            })).reverse(); // Reverse to ensure the order matches sort by create_at desc
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunsPerChannel(operator.database, channelId, false);

                sub = observable.subscribe((runs) => {
                    expect(runs.length).toBe(1);
                    expect(runs[0].id).toBe(mockRuns[1].id); // Only the unfinished run
                    done();
                });
            });
        });
    });

    describe('observePlaybookRunProgress', () => {
        let sub: Subscription | null = null;
        afterEach(() => {
            if (!sub?.closed) {
                sub?.unsubscribe();
            }
        });

        it('should return 0 when there are no checklist', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

                sub = observable.subscribe((progress) => {
                    expect(progress).toBe(0);
                    done();
                });
            });
        });

        it('should return 0 when there are no checklist items', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 0);
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            }).then(() => {
                const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

                sub = observable.subscribe((progress) => {
                    expect(progress).toBe(0);
                    done();
                });
            });
        });

        it('should return 100 when all checklist items are completed', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 2);
            mockRuns[0].checklists[0].items.forEach((item) => {
                item.state = 'closed';
                item.completed_at = Date.now();
            });
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            }).then(() => {
                const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

                sub = observable.subscribe((progress) => {
                    expect(progress).toBe(100.00);
                    done();
                });
            });
        });

        it('should return correct progress when some checklist items are completed', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 9);
            if (mockRuns[0].checklists[0].items.length < 3) {
                const index = mockRuns[0].checklists[0].items.length - 1;
                mockRuns[0].checklists[0].items.push(
                    TestHelper.createPlaybookItem(mockRuns[0].checklists[0].id, index + 1),
                    TestHelper.createPlaybookItem(mockRuns[0].checklists[0].id, index + 2),
                    TestHelper.createPlaybookItem(mockRuns[0].checklists[0].id, index + 3),
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
            }).then(() => {
                const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

                sub = observable.subscribe((progress) => {
                    expect(progress).toBeGreaterThan(0);
                    expect(progress).toBeLessThan(100.00);
                    done();
                });
            });
        });

        it('should return 0 when all checklist items are open', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 2);

            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            }).then(() => {
                const observable = observePlaybookRunProgress(operator.database, mockRuns[0].id);

                sub = observable.subscribe((progress) => {
                    expect(progress).toBe(0);
                    done();
                });
            });
        });
    });

    describe('observePlaybookRunParticipants', () => {
        let sub: Subscription | null = null;
        const initialUsers = [
            TestHelper.fakeUser({id: 'user1', username: 'User One'}),
        ];
        const updatedUsers = [
            TestHelper.fakeUser({id: 'user2', username: 'User Two'}),
            TestHelper.fakeUser({id: 'user3', username: 'User Three'}),
        ];

        beforeEach(async () => {
            await operator.handleUsers({
                users: [...initialUsers, ...updatedUsers],
                prepareRecordsOnly: false,
            });
        });

        afterEach(() => {
            if (!sub?.closed) {
                sub?.unsubscribe();
            }
        });

        it('should return an empty array if the playbook run is not found', (done) => {
            const runId = 'nonexistent_run';

            const observable = observePlaybookRunParticipants(operator.database, runId);

            sub = observable.subscribe((participants) => {
                expect(participants).toEqual([]);
                done();
            });
        });

        it('should return an empty array if the playbook run has no participants', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);
            mockRuns[0].participant_ids = [];
            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunParticipants(operator.database, mockRuns[0].id);

                sub = observable.subscribe((participants) => {
                    expect(participants).toEqual([]);
                    done();
                });
            });
        });

        it('should return the participants of the playbook run', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);
            mockRuns[0].participant_ids = updatedUsers.map((user) => user.id);

            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunParticipants(operator.database, mockRuns[0].id);

                sub = observable.
                    pipe(filter((participants) => participants.length > 0)).
                    subscribe((participants) => {
                        expect(participants.length).toBe(2);
                        expect(participants.map((user) => user.id)).toEqual(updatedUsers.map((user) => user.id));
                        done();
                    });
            });
        });

        it('should update participants when the playbook run is updated', (done) => {
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);
            mockRuns[0].participant_ids = initialUsers.map((user) => user.id);

            operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            }).then(() => {
                const observable = observePlaybookRunParticipants(operator.database, mockRuns[0].id);

                let callCount = 0;
                sub = observable.
                    pipe(filter((participants) => participants.length > 0)).
                    subscribe((participants) => {
                        callCount++;
                        if (callCount === 1) {
                            expect(participants.map((user) => user.id)).toEqual(initialUsers.map((user) => user.id));

                            // Update the playbook run with new participants
                            mockRuns[0].participant_ids = updatedUsers.map((user) => user.id);
                            operator.handlePlaybookRun({
                                runs: mockRuns,
                                prepareRecordsOnly: false,
                                removeAssociatedRecords: false,
                            });
                        } else if (callCount === 2) {
                            expect(participants.map((user) => user.id)).toEqual(updatedUsers.map((user) => user.id));
                            done();
                        }
                    });
            });
        });
    });
});
