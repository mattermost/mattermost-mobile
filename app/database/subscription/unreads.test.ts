// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import ThreadsSyncStore from '@store/threads_sync_store';
import TestHelper from '@test/test_helper';
import {enableFakeTimers, disableFakeTimers, advanceTimers} from '@test/timer_helpers';

import {observeUnreadsByServer} from './unreads';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'http://test-server.com';

// Helper: create a team + myteam membership in the DB
async function insertTeam(operator: ServerDataOperator, teamId: string) {
    const team = TestHelper.fakeTeam({id: teamId});
    await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
    await operator.handleMyTeam({myTeams: [{id: teamId, roles: 'team_user'}], prepareRecordsOnly: false});
    return team;
}

// Helper: create a channel + mychannelmembership in the DB.
// Sets both mention_count and mention_count_root to mentionsCount so the value is
// preserved regardless of whether CRT is enabled (handleMyChannel picks root when CRT on).
async function insertChannel(
    operator: ServerDataOperator,
    channelId: string,
    teamId: string,
    mentionsCount: number,
    isUnread: boolean,
) {
    const channel = TestHelper.fakeChannel({id: channelId, team_id: teamId, delete_at: 0});
    const myChannel = TestHelper.fakeChannelMember({
        channel_id: channelId,
        mention_count: mentionsCount,
        mention_count_root: mentionsCount,
    });
    await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
    await operator.handleMyChannel({
        channels: [channel],
        myChannels: [{...myChannel, is_unread: isUnread} as ChannelMembership],
        prepareRecordsOnly: false,
    });
}

// Helper: create a thread (+ its root post) in the DB so queryThreads can find it via the
// THREAD → POST → CHANNEL nested join. The thread ID equals the root post ID.
async function insertThread(
    operator: ServerDataOperator,
    channelId: string,
    teamId: string,
    unreadMentions: number,
) {
    const thread = TestHelper.fakeThread({is_following: true, unread_mentions: unreadMentions, unread_replies: unreadMentions, reply_count: unreadMentions});
    const rootPost = TestHelper.fakePost({id: thread.id, channel_id: channelId});
    const [postModels, threadModels] = await Promise.all([
        operator.handlePosts({
            actionType: 'POSTS_IN_CHANNEL',
            order: [rootPost.id],
            posts: [rootPost],
            previousPostId: '',
            prepareRecordsOnly: true,
        }),
        operator.handleThreads({
            threads: [{...thread, post: rootPost, lastFetchedAt: thread.last_reply_at}],
            teamId,
            prepareRecordsOnly: true,
        }),
    ]);
    await operator.batchRecords([...postModels, ...threadModels], 'insertThread');
}

// Helper: write TEAM_BADGE_COUNTS blob to System table
async function writeBadgeCounts(operator: ServerDataOperator, counts: TeamBadgeCounts) {
    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(counts)}],
        prepareRecordsOnly: false,
    });
}

// Helper: collect the first emission from the observable.
// Uses a ref pattern to handle both synchronous and async emissions safely.
function firstEmission<T>(observable: import('rxjs').Observable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        // Use a ref so the callback can call unsubscribe() even when emitted synchronously
        // (before the `sub` assignment completes on the outer scope).
        const ref: {sub?: import('rxjs').Subscription} = {};

        ref.sub = observable.subscribe({
            next: (value) => {
                ref.sub?.unsubscribe();
                resolve(value);
            },
            error: reject,
        });

        setTimeout(() => {
            ref.sub?.unsubscribe();
            reject(new Error('Observable did not emit within timeout'));
        }, 1000);
    });
}

describe('observeUnreadsByServer', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        enableFakeTimers();
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.getServerDatabaseAndOperator(serverUrl).operator;

        // Enable CRT: CollapsedThreads=always_on + server 7.6+ (feature flag check removed in 7.6)
        await operator.handleConfigs({
            configs: [
                {id: 'CollapsedThreads', value: 'always_on'},
                {id: 'FeatureFlagCollapsedThreads', value: 'true'},
                {id: 'Version', value: '7.6.0'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        // Default: threads not fetched (false) so blob values are used for thread counts
        jest.spyOn(ThreadsSyncStore, 'observeThreadsFetched').mockReturnValue(of$(false));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
        disableFakeTimers();
    });

    it('should return zeros when server database does not exist', async () => {
        // of$() emits synchronously — no timer advance needed
        const result = await firstEmission(observeUnreadsByServer('http://nonexistent.com'));
        expect(result).toEqual({mentions: 0, unread: false});
    });

    it('should return zeros when there are no teams and no direct channels', async () => {
        const promise = firstEmission(observeUnreadsByServer(serverUrl));
        await advanceTimers(0);
        const result = await promise;
        expect(result).toEqual({mentions: 0, unread: false});
    });

    describe('blob-only path (no DB channel rows)', () => {
        it('should return team badge counts from blob when no channel rows exist', async () => {
            const teamId = TestHelper.generateId();
            await insertTeam(operator, teamId);

            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 3, hasUnreads: true, threadMentionCount: 2, threadHasUnreads: false},
                },
                direct: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            // channel mentions (3) + thread mentions from blob (2) = 5
            expect(result.mentions).toBe(5);
            expect(result.unread).toBe(true);
        });

        it('should include direct channel counts from blob when no DM rows exist', async () => {
            const teamId = TestHelper.generateId();
            await insertTeam(operator, teamId);

            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
                },
                direct: {mentionCount: 4, hasUnreads: true, threadMentionCount: 1, threadHasUnreads: false},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            // direct channel mentions (4) + direct thread from blob (1) = 5
            expect(result.mentions).toBe(5);
            expect(result.unread).toBe(true);
        });

        it('should aggregate blob counts across multiple teams plus direct', async () => {
            const teamId1 = TestHelper.generateId();
            const teamId2 = TestHelper.generateId();
            await insertTeam(operator, teamId1);
            await insertTeam(operator, teamId2);

            await writeBadgeCounts(operator, {
                teams: {
                    [teamId1]: {mentionCount: 2, hasUnreads: false, threadMentionCount: 1, threadHasUnreads: false},
                    [teamId2]: {mentionCount: 3, hasUnreads: true, threadMentionCount: 0, threadHasUnreads: false},
                },
                direct: {mentionCount: 1, hasUnreads: false, threadMentionCount: 2, threadHasUnreads: false},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            // team1: 2+1=3, team2: 3+0=3, direct: 1+2=3 → total 9
            expect(result.mentions).toBe(9);
            expect(result.unread).toBe(true);
        });
    });

    describe('DB path (channel rows present, threads fetched)', () => {
        it('should use DB channel mentions when channel rows are present', async () => {
            const teamId = TestHelper.generateId();
            const channelId = TestHelper.generateId();
            await insertTeam(operator, teamId);
            await insertChannel(operator, channelId, teamId, 7, false);

            // blob has different values — DB should win for channel part
            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 99, hasUnreads: true, threadMentionCount: 0, threadHasUnreads: false},
                },
                direct: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
            });

            // threads fetched → DB thread count (0 threads in DB = 0)
            jest.spyOn(ThreadsSyncStore, 'observeThreadsFetched').mockReturnValue(of$(true));

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            // DB says 7 channel mentions, 0 thread mentions (no threads in DB)
            expect(result.mentions).toBe(7);
            expect(result.unread).toBe(false);
        });

        it('should include thread mentions from DB when threads are fetched', async () => {
            const teamId = TestHelper.generateId();
            const channelId = TestHelper.generateId();
            await insertTeam(operator, teamId);
            await insertChannel(operator, channelId, teamId, 2, false);
            await insertThread(operator, channelId, teamId, 3);

            jest.spyOn(ThreadsSyncStore, 'observeThreadsFetched').mockReturnValue(of$(true));

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            // channel (2) + thread (3) = 5
            expect(result.mentions).toBe(5);
        });
    });

    describe('excludeThreadMentions=true (global threads screen)', () => {
        it('should exclude thread mentions from blob when excludeThreadMentions=true', async () => {
            const teamId = TestHelper.generateId();
            await insertTeam(operator, teamId);

            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 3, hasUnreads: true, threadMentionCount: 5, threadHasUnreads: true},
                },
                direct: {mentionCount: 1, hasUnreads: false, threadMentionCount: 2, threadHasUnreads: false},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl, true));
            await advanceTimers(0);
            const result = await promise;

            // team: channel only (3), direct: channel only (1) — thread counts excluded
            expect(result.mentions).toBe(4);

            // unread: team hasUnreads=true; threadHasUnreads excluded
            expect(result.unread).toBe(true);
        });

        it('should exclude thread unread flag when excludeThreadMentions=true and channel has no unreads', async () => {
            const teamId = TestHelper.generateId();
            await insertTeam(operator, teamId);

            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: true},
                },
                direct: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: true},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl, true));
            await advanceTimers(0);
            const result = await promise;

            // thread unreads excluded → unread=false
            expect(result.mentions).toBe(0);
            expect(result.unread).toBe(false);
        });

        it('should exclude DB thread mentions when channels and threads are fetched and excludeThreadMentions=true', async () => {
            const teamId = TestHelper.generateId();
            const channelId = TestHelper.generateId();
            await insertTeam(operator, teamId);
            await insertChannel(operator, channelId, teamId, 4, false);
            await insertThread(operator, channelId, teamId, 6);

            jest.spyOn(ThreadsSyncStore, 'observeThreadsFetched').mockReturnValue(of$(true));

            const promise = firstEmission(observeUnreadsByServer(serverUrl, true));
            await advanceTimers(0);
            const result = await promise;

            // channel (4), thread mentions excluded
            expect(result.mentions).toBe(4);
        });
    });

    describe('no-teams path (direct badge only)', () => {
        it('should return direct blob counts when there are no teams', async () => {
            // No team inserted — only direct badge path runs
            await writeBadgeCounts(operator, {
                teams: {},
                direct: {mentionCount: 5, hasUnreads: true, threadMentionCount: 3, threadHasUnreads: false},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            expect(result.mentions).toBe(8); // 5 channel + 3 thread
            expect(result.unread).toBe(true);
        });

        it('should exclude thread mentions in no-teams path when excludeThreadMentions=true', async () => {
            await writeBadgeCounts(operator, {
                teams: {},
                direct: {mentionCount: 5, hasUnreads: false, threadMentionCount: 3, threadHasUnreads: true},
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl, true));
            await advanceTimers(0);
            const result = await promise;

            expect(result.mentions).toBe(5); // thread mentions excluded
            expect(result.unread).toBe(false); // threadHasUnreads excluded
        });
    });

    describe('no-blob path (blob undefined)', () => {
        it('should return zeros when no blob and no channel rows exist', async () => {
            const teamId = TestHelper.generateId();
            await insertTeam(operator, teamId);

            // No writeBadgeCounts call — blob is undefined
            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            expect(result.mentions).toBe(0);
            expect(result.unread).toBe(false);
        });

        it('should return zeros in no-teams path when no blob and no DM channels exist', async () => {
            // No team, no blob, no DM channels
            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            expect(result.mentions).toBe(0);
            expect(result.unread).toBe(false);
        });
    });

    describe('DB direct channels path (DM channels in DB)', () => {
        it('should use DB mentions when DM channel rows are present', async () => {
            // Insert a DM channel (team_id='') with 4 unread mentions.
            // total_msg_count > msg_count so is_unread=true is computed by handleMyChannel.
            const dmChannel = TestHelper.fakeChannel({
                id: TestHelper.generateId(),
                team_id: '',
                type: 'D',
                delete_at: 0,
                total_msg_count: 10,
                total_msg_count_root: 10,
            });
            const dmMyChannel = TestHelper.fakeChannelMember({
                channel_id: dmChannel.id,
                mention_count: 4,
                mention_count_root: 4,
                msg_count: 5,
                msg_count_root: 5,
            });
            await operator.handleChannel({channels: [dmChannel], prepareRecordsOnly: false});
            await operator.handleMyChannel({
                channels: [dmChannel],
                myChannels: [dmMyChannel as ChannelMembership],
                prepareRecordsOnly: false,
            });

            const promise = firstEmission(observeUnreadsByServer(serverUrl));
            await advanceTimers(0);
            const result = await promise;

            // DM channel mentions from DB (4), is_unread=true (10 total - 5 read = 5 unread msgs)
            expect(result.mentions).toBe(4);
            expect(result.unread).toBe(true);
        });
    });

    describe('distinctUntilChanged suppresses duplicate emissions', () => {
        it('should not re-emit when value does not change', async () => {
            const teamId = TestHelper.generateId();
            await insertTeam(operator, teamId);
            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 2, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
                },
                direct: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
            });

            let emitCount = 0;
            await new Promise<void>((resolve, reject) => {
                const ref: {sub?: import('rxjs').Subscription} = {};
                ref.sub = observeUnreadsByServer(serverUrl).subscribe({
                    next: () => {
                        emitCount++;
                        if (emitCount >= 1) {
                            ref.sub?.unsubscribe();
                            resolve();
                        }
                    },
                    error: reject,
                });
                setTimeout(() => {
                    ref.sub?.unsubscribe();
                    reject(new Error('timeout'));
                }, 1000);
            });
            await advanceTimers(0);

            // Received at least one emission; writing the same blob again should not add another
            const countBefore = emitCount;
            await writeBadgeCounts(operator, {
                teams: {
                    [teamId]: {mentionCount: 2, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
                },
                direct: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false},
            });
            await advanceTimers(50);

            expect(emitCount).toBe(countBefore);
        });
    });
});
