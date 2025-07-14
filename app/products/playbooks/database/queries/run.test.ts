// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    queryPlaybookRunsPerChannel,
    getPlaybookRunById,
    observePlaybookRunById,
    observePlaybookRunProgress,
    getLastPlaybookRunsFetchAt,
    queryParticipantsFromAPIRun,
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
        it('should observe the playbook run if found', async () => {
            const subscriptionNext = jest.fn();
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = observePlaybookRunById(operator.database, mockRuns[0].id);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(expect.objectContaining({
                id: mockRuns[0].id,
            }));
        });

        it('should return undefined if the playbook run is not found', async () => {
            const subscriptionNext = jest.fn();
            const result = observePlaybookRunById(operator.database, 'nonexistent_run');
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(undefined);
        });
    });

    describe('observePlaybookRunProgress', () => {
        it('should return 0 when there are no checklist', async () => {
            const subscriptionNext = jest.fn();
            const mockRuns = TestHelper.createPlaybookRuns(1, 0, 0);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
            });

            const result = observePlaybookRunProgress(operator.database, mockRuns[0].id);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(0);
        });

        it('should return 0 when there are no checklist items', async () => {
            const subscriptionNext = jest.fn();
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 0);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const result = observePlaybookRunProgress(operator.database, mockRuns[0].id);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(0);
        });

        it('should return 100 when all checklist items are completed', async () => {
            const subscriptionNext = jest.fn();
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 2);
            mockRuns[0].checklists[0].items.forEach((item) => {
                item.state = 'closed';
                item.completed_at = Date.now();
            });

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const result = observePlaybookRunProgress(operator.database, mockRuns[0].id);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(100.00);
        });

        it('should return correct progress when some checklist items are completed', async () => {
            const subscriptionNext = jest.fn();
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

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const result = observePlaybookRunProgress(operator.database, mockRuns[0].id);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(expect.any(Number));
            const progress = subscriptionNext.mock.calls[0][0];
            expect(progress).toBeGreaterThan(0);
            expect(progress).toBeLessThan(100.00);
        });

        it('should return 0 when all checklist items are open', async () => {
            const subscriptionNext = jest.fn();
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 2);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                removeAssociatedRecords: false,
                processChildren: true,
            });

            const result = observePlaybookRunProgress(operator.database, mockRuns[0].id);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(0);
        });
    });

    describe('getLastPlaybookRunsFetchAt', () => {
        it('should return the lastPlaybookRunsFetchAt value when channel exists', async () => {
            const channelId = 'channel1';
            const lastPlaybookRunsFetchAt = 1620000000000;

            await operator.handleMyChannel({
                channels: [TestHelper.fakeChannel({id: channelId})],
                myChannels: [TestHelper.fakeMyChannel({channel_id: channelId})],
                prepareRecordsOnly: false,
            });

            // Update the record with the lastPlaybookRunsFetchAt value
            const myChannelRecord = await operator.database.get(MM_TABLES.SERVER.MY_CHANNEL).find(channelId);
            await operator.database.write(async () => {
                await myChannelRecord.update((record: any) => {
                    record.lastPlaybookRunsFetchAt = lastPlaybookRunsFetchAt;
                });
            });

            const result = await getLastPlaybookRunsFetchAt(operator.database, channelId);

            expect(result).toBe(lastPlaybookRunsFetchAt);
        });

        it('should return 0 when channel does not exist', async () => {
            const result = await getLastPlaybookRunsFetchAt(operator.database, 'nonexistent_channel');

            expect(result).toBe(0);
        });

        it('should return 0 when channel exists but lastPlaybookRunsFetchAt is not set', async () => {
            const channelId = 'channel2';
            await operator.handleMyChannel({
                channels: [TestHelper.fakeChannel({id: channelId})],
                myChannels: [TestHelper.fakeMyChannel({channel_id: channelId})],
                prepareRecordsOnly: false,
            });

            const result = await getLastPlaybookRunsFetchAt(operator.database, channelId);

            expect(result).toBe(0);
        });
    });

    describe('queryParticipantsFromAPIRun', () => {
        it('should return participants excluding the owner', async () => {
            const ownerId = 'owner-user-id';
            const participant1Id = 'participant-1-id';
            const participant2Id = 'participant-2-id';
            const participant3Id = 'participant-3-id';

            // Create mock users
            const mockUsers = [
                TestHelper.fakeUser({id: ownerId, username: 'owner'}),
                TestHelper.fakeUser({id: participant1Id, username: 'participant1'}),
                TestHelper.fakeUser({id: participant2Id, username: 'participant2'}),
                TestHelper.fakeUser({id: participant3Id, username: 'participant3'}),
            ];

            await operator.handleUsers({
                users: mockUsers,
                prepareRecordsOnly: false,
            });

            // Create a mock playbook run with participants including the owner
            const mockRun = TestHelper.fakePlaybookRun({
                owner_user_id: ownerId,
                participant_ids: [ownerId, participant1Id, participant2Id, participant3Id],
            });

            const result = queryParticipantsFromAPIRun(operator.database, mockRun);
            const participants = await result.fetch();

            // Should return 3 participants (excluding the owner)
            expect(participants).toHaveLength(3);

            // Should not include the owner
            const participantIds = participants.map((p) => p.id);
            expect(participantIds).toContain(participant1Id);
            expect(participantIds).toContain(participant2Id);
            expect(participantIds).toContain(participant3Id);
            expect(participantIds).not.toContain(ownerId);
        });

        it('should return empty array when no participants exist', async () => {
            const ownerId = 'owner-user-id';

            // Create only the owner user
            const mockUser = TestHelper.fakeUser({id: ownerId, username: 'owner'});
            await operator.handleUsers({
                users: [mockUser],
                prepareRecordsOnly: false,
            });

            // Create a mock playbook run with only the owner as participant
            const mockRun = TestHelper.fakePlaybookRun({
                owner_user_id: ownerId,
                participant_ids: [ownerId],
            });

            const result = queryParticipantsFromAPIRun(operator.database, mockRun);
            const participants = await result.fetch();

            // Should return empty array since owner is excluded
            expect(participants).toHaveLength(0);
        });

        it('should return empty array when participants do not exist in database', async () => {
            const ownerId = 'owner-user-id';
            const nonExistentParticipantId = 'non-existent-participant-id';

            // Create only the owner user
            const mockUser = TestHelper.fakeUser({id: ownerId, username: 'owner'});
            await operator.handleUsers({
                users: [mockUser],
                prepareRecordsOnly: false,
            });

            // Create a mock playbook run with non-existent participant
            const mockRun = TestHelper.fakePlaybookRun({
                owner_user_id: ownerId,
                participant_ids: [ownerId, nonExistentParticipantId],
            });

            const result = queryParticipantsFromAPIRun(operator.database, mockRun);
            const participants = await result.fetch();

            // Should return empty array since owner is excluded and participant doesn't exist
            expect(participants).toHaveLength(0);
        });

        it('should handle case where owner is not in participant_ids', async () => {
            const ownerId = 'owner-user-id';
            const participant1Id = 'participant-1-id';
            const participant2Id = 'participant-2-id';

            // Create mock users
            const mockUsers = [
                TestHelper.fakeUser({id: ownerId, username: 'owner'}),
                TestHelper.fakeUser({id: participant1Id, username: 'participant1'}),
                TestHelper.fakeUser({id: participant2Id, username: 'participant2'}),
            ];

            await operator.handleUsers({
                users: mockUsers,
                prepareRecordsOnly: false,
            });

            // Create a mock playbook run where owner is not in participant_ids
            const mockRun = TestHelper.fakePlaybookRun({
                owner_user_id: ownerId,
                participant_ids: [participant1Id, participant2Id], // Owner not included
            });

            const result = queryParticipantsFromAPIRun(operator.database, mockRun);
            const participants = await result.fetch();

            // Should return all participants since owner is not in the list
            expect(participants).toHaveLength(2);

            const participantIds = participants.map((p) => p.id);
            expect(participantIds).toContain(participant1Id);
            expect(participantIds).toContain(participant2Id);
            expect(participantIds).not.toContain(ownerId);
        });
    });
});
