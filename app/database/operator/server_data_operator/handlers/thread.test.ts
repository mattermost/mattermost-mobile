// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {shouldUpdateThreadRecord} from '@database/operator/server_data_operator/comparators/thread';
import {transformThreadRecord, transformThreadParticipantRecord, transformThreadInTeamRecord, transformTeamThreadsSyncRecord} from '@database/operator/server_data_operator/transformers/thread';

import type ServerDataOperator from '..';

jest.mock('@database/operator/utils/thread', () => {
    return {
        sanitizeThreadParticipants: ({rawParticipants}: {rawParticipants: ThreadParticipant[]}) => {
            return {
                createParticipants: rawParticipants.map((participant) => ({
                    raw: participant,
                })),
            };
        },
    };
});

describe('*** Operator: Thread Handlers tests ***', () => {
    let operator: ServerDataOperator;

    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> HandleThreads: should write to the the Thread & ThreadParticipant & ThreadsInTeam tables', async () => {
        expect.assertions(4);

        const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const spyOnHandleThreadParticipants = jest.spyOn(operator, 'handleThreadParticipants');
        const spyOnHandleThreadInTeam = jest.spyOn(operator, 'handleThreadInTeam');

        const threads = [
            {
                id: 'thread-1',
                reply_count: 2,
                last_reply_at: 123,
                last_viewed_at: 123,
                participants: [{
                    id: 'user-1',
                }],
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
                lastFetchedAt: 0,
            },
        ] as ThreadWithLastFetchedAt[];

        const threadsMap = {team_id_1: threads};
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: 'team_id_1'});

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformThreadRecord,
            createOrUpdateRawValues: threads,
            tableName: 'Thread',
            prepareRecordsOnly: true,
            shouldUpdate: shouldUpdateThreadRecord,
        }, 'handleThreads(NEVER)');

        // Should handle participants
        expect(spyOnHandleThreadParticipants).toHaveBeenCalledWith({
            threadsParticipants: threads.map((thread) => ({
                thread_id: thread.id,
                participants: thread.participants.map((participant) => ({
                    id: participant.id,
                    thread_id: thread.id,
                })),
            })),
            prepareRecordsOnly: true,
        });

        expect(spyOnHandleThreadInTeam).toHaveBeenCalledWith({
            threadsMap,
            prepareRecordsOnly: true,
        });

        // Only one batch operation for both tables
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> HandleThreadParticipants: should write to the the ThreadParticipant table', async () => {
        expect.assertions(1);

        const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

        const threadsParticipants = [
            {
                thread_id: 'thread-1',
                participants: [{
                    id: 'user-1',
                    thread_id: 'thread-1',
                }],
            },
        ];

        await operator.handleThreadParticipants({threadsParticipants, prepareRecordsOnly: false});

        expect(spyOnPrepareRecords).toHaveBeenCalledWith({
            createRaws: [{
                raw: threadsParticipants[0].participants[0],
            }],
            transformer: transformThreadParticipantRecord,
            tableName: 'ThreadParticipant',
        });
    });

    it('=> HandleThreadInTeam: should write to the the ThreadsInTeam table', async () => {
        expect.assertions(1);

        const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

        const team1Threads = [
            {
                id: 'thread-1',
                reply_count: 2,
                last_reply_at: 123,
                last_viewed_at: 123,
                participants: [{
                    id: 'user-1',
                }],
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
            },
            {
                id: 'thread-2',
                reply_count: 2,
                last_reply_at: 123,
                last_viewed_at: 123,
                participants: [{
                    id: 'user-1',
                }],
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
            },
        ] as Thread[];

        const team2Threads = [
            {
                id: 'thread-2',
                reply_count: 2,
                last_reply_at: 123,
                last_viewed_at: 123,
                participants: [{
                    id: 'user-1',
                }],
                is_following: true,
                unread_replies: 2,
                unread_mentions: 0,
            },
        ] as Thread[];

        const threadsMap = {
            team_id_1: team1Threads,
            team_id_2: team2Threads,
        };

        await operator.handleThreadInTeam({threadsMap, prepareRecordsOnly: false});

        expect(spyOnPrepareRecords).toHaveBeenCalledWith({
            createRaws: [{
                raw: {team_id: 'team_id_1', thread_id: 'thread-2'},
                record: undefined,
            }, {
                raw: {team_id: 'team_id_2', thread_id: 'thread-2'},
                record: undefined,
            }],
            transformer: transformThreadInTeamRecord,
            tableName: 'ThreadsInTeam',
        });
    });

    it('=> HandleTeamThreadsSync: should write to the the TeamThreadsSync table', async () => {
        expect.assertions(1);

        const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

        const data = [
            {
                id: 'team_id_1',
                earliest: 100,
                latest: 200,
            },
            {
                id: 'team_id_2',
                earliest: 100,
                latest: 300,
            },
        ] as TeamThreadsSync[];

        await operator.handleTeamThreadsSync({data, prepareRecordsOnly: false});

        expect(spyOnPrepareRecords).toHaveBeenCalledWith({
            createRaws: [{
                raw: {id: 'team_id_1', earliest: 100, latest: 200},
            }, {
                raw: {id: 'team_id_2', earliest: 100, latest: 300},
            }],
            updateRaws: [],
            transformer: transformTeamThreadsSyncRecord,
            tableName: 'TeamThreadsSync',
        });
    });

    it('=> HandleTeamThreadsSync: should update the record in TeamThreadsSync table', async () => {
        expect.assertions(1);

        const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

        const data = [
            {
                id: 'team_id_1',
                earliest: 100,
                latest: 300,
            },
        ] as TeamThreadsSync[];

        await operator.handleTeamThreadsSync({data, prepareRecordsOnly: false});

        expect(spyOnPrepareRecords).toHaveBeenCalledWith({
            createRaws: [],
            updateRaws: [
                expect.objectContaining({
                    raw: {id: 'team_id_1', earliest: 100, latest: 300},
                }),
            ],
            transformer: transformTeamThreadsSyncRecord,
            tableName: 'TeamThreadsSync',
        });
    });
});
