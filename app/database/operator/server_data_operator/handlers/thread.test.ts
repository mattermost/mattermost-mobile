// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {isRecordThreadEqualToRaw} from '@database/operator/server_data_operator/comparators';
import {transformThreadRecord, transformThreadParticipantRecord} from '@database/operator/server_data_operator/transformers/thread';

import ServerDataOperator from '..';

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
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleThreads: should write to the the Thread & ThreadParticipant table', async () => {
        const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');
        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const spyOnHandleThreadParticipants = jest.spyOn(operator, 'handleThreadParticipants');

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
            },
        ] as Thread[];

        await operator.handleThreads({threads, prepareRecordsOnly: false});

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordThreadEqualToRaw,
            fieldName: 'id',
            transformer: transformThreadRecord,
            createOrUpdateRawValues: threads,
            tableName: 'Thread',
            prepareRecordsOnly: true,
        });

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

        // Only one batch operation for both tables
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> HandleThreadParticipants: should write to the the ThreadParticipant table', async () => {
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
});
