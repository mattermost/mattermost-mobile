// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import SyncBlobQueue from './sync_blob_queue';

describe('SyncBlobQueue', () => {
    const serverUrl = 'https://server.test';
    const otherServerUrl = 'https://other.test';

    describe('isSyncing', () => {
        it('should return false before beginSync is called', () => {
            expect(SyncBlobQueue.isSyncing(serverUrl)).toBe(false);
        });

        it('should return true after beginSync', () => {
            SyncBlobQueue.beginSync(serverUrl);

            expect(SyncBlobQueue.isSyncing(serverUrl)).toBe(true);
        });

        it('should return false after endSync', () => {
            SyncBlobQueue.beginSync(serverUrl);
            SyncBlobQueue.endSync(serverUrl);

            expect(SyncBlobQueue.isSyncing(serverUrl)).toBe(false);
        });

        it('should track servers independently', () => {
            SyncBlobQueue.beginSync(serverUrl);

            expect(SyncBlobQueue.isSyncing(serverUrl)).toBe(true);
            expect(SyncBlobQueue.isSyncing(otherServerUrl)).toBe(false);
        });
    });

    describe('queueBlobOp / endSync', () => {
        it('should return an empty array when nothing was queued', () => {
            SyncBlobQueue.beginSync(serverUrl);

            expect(SyncBlobQueue.endSync(serverUrl)).toEqual([]);
        });

        it('should return an empty array when endSync is called without a prior beginSync', () => {
            expect(SyncBlobQueue.endSync(serverUrl)).toEqual([]);
        });

        it('should drain ops in the order they were queued', () => {
            SyncBlobQueue.beginSync(serverUrl);

            SyncBlobQueue.queueBlobOp(serverUrl, {op: 'increment', teamId: 'team-a', mentionDelta: 1, threadMentionDelta: 0, eventTimestamp: 100});
            SyncBlobQueue.queueBlobOp(serverUrl, {op: 'decrement', teamId: 'team-a', clearedMentions: 1, clearedThreadMentions: 0, eventTimestamp: 200});

            const drained = SyncBlobQueue.endSync(serverUrl);

            expect(drained).toEqual([
                {op: 'increment', teamId: 'team-a', mentionDelta: 1, threadMentionDelta: 0, eventTimestamp: 100},
                {op: 'decrement', teamId: 'team-a', clearedMentions: 1, clearedThreadMentions: 0, eventTimestamp: 200},
            ]);
        });

        it('should not queue ops for a server that has not called beginSync', () => {
            SyncBlobQueue.queueBlobOp(serverUrl, {op: 'clearThreads', teamId: 'team-a', eventTimestamp: 100});

            SyncBlobQueue.beginSync(serverUrl);

            expect(SyncBlobQueue.endSync(serverUrl)).toEqual([]);
        });

        it('should track servers independently', () => {
            SyncBlobQueue.beginSync(serverUrl);
            SyncBlobQueue.beginSync(otherServerUrl);

            SyncBlobQueue.queueBlobOp(serverUrl, {op: 'clearThreads', teamId: 'team-a', eventTimestamp: 100});
            SyncBlobQueue.queueBlobOp(otherServerUrl, {op: 'migrateDirectToTeam', teamId: 'team-b', mentionCount: 2, hasUnreads: true, eventTimestamp: 200});

            expect(SyncBlobQueue.endSync(serverUrl)).toEqual([
                {op: 'clearThreads', teamId: 'team-a', eventTimestamp: 100},
            ]);
            expect(SyncBlobQueue.endSync(otherServerUrl)).toEqual([
                {op: 'migrateDirectToTeam', teamId: 'team-b', mentionCount: 2, hasUnreads: true, eventTimestamp: 200},
            ]);
        });

        it('should start a fresh queue on a new beginSync after a prior endSync', () => {
            SyncBlobQueue.beginSync(serverUrl);
            SyncBlobQueue.queueBlobOp(serverUrl, {op: 'clearThreads', teamId: 'team-a', eventTimestamp: 100});
            SyncBlobQueue.endSync(serverUrl);

            SyncBlobQueue.beginSync(serverUrl);

            expect(SyncBlobQueue.endSync(serverUrl)).toEqual([]);
        });
    });
});
