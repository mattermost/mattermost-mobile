// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, processReceivedThreads, updateThread} from '@actions/local/thread';
import DatabaseManager from '@database/manager';
import {adjustThreadInBlob, clearTeamThreadsInBlob, getCurrentTeamId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import SyncBlobQueue from '@store/sync_blob_queue';
import ThreadsSyncStore from '@store/threads_sync_store';

import {handleThreadUpdatedEvent, handleThreadReadChangedEvent, handleThreadFollowChangedEvent} from './threads';

jest.mock('@actions/local/thread');
jest.mock('@database/manager');
jest.mock('@queries/servers/system');
jest.mock('@store/ephemeral_store');
jest.mock('@store/sync_blob_queue');
jest.mock('@store/threads_sync_store');

describe('WebSocket Threads Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const teamId = 'team-id';
    const threadId = 'thread-id';

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(updateThread).mockReset();

        await DatabaseManager.init([serverUrl]);
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: {},
            operator: {},
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('handleThreadUpdatedEvent', () => {
        it('should process received thread', async () => {
            const mockThread = {
                id: threadId,
                reply_count: 3,
            };

            const msg = {
                data: {
                    thread: JSON.stringify(mockThread),
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage;

            jest.mocked(getCurrentTeamId).mockResolvedValue(teamId);
            jest.mocked(processReceivedThreads);

            await handleThreadUpdatedEvent(serverUrl, msg);

            expect(processReceivedThreads).toHaveBeenCalledWith(
                serverUrl,
                [{...mockThread, is_following: true}],
                teamId,
            );
        });

        it('should handle missing team_id', async () => {
            const mockThread = {
                id: threadId,
                reply_count: 3,
            };

            const msg = {
                data: {
                    thread: JSON.stringify(mockThread),
                },
                broadcast: {},
            } as WebSocketMessage;

            jest.mocked(getCurrentTeamId).mockResolvedValue(teamId);

            await handleThreadUpdatedEvent(serverUrl, msg);

            expect(processReceivedThreads).toHaveBeenCalledWith(
                serverUrl,
                [{...mockThread, is_following: true}],
                teamId,
            );
        });

        it('should handle error gracefully', async () => {
            const msg = {
                data: {
                    thread: 'invalid-json',
                },
                broadcast: {},
            } as WebSocketMessage;

            await handleThreadUpdatedEvent(serverUrl, msg);

            expect(processReceivedThreads).not.toHaveBeenCalled();
        });

        describe('TEAM_BADGE_COUNTS blob mirror', () => {
            const baseMsg = (overrides: Record<string, unknown> = {}): WebSocketMessage => ({
                data: {
                    thread: JSON.stringify({id: threadId, unread_mentions: 1, unread_replies: 2}),
                    previous_unread_mentions: 2,
                    ...overrides,
                },
                broadcast: {team_id: teamId},
            } as unknown as WebSocketMessage);

            beforeEach(() => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            });

            it('decrements blob when previous_unread_mentions > thread.unread_mentions (delete path)', async () => {
                await handleThreadUpdatedEvent(serverUrl, baseMsg());

                expect(adjustThreadInBlob).toHaveBeenCalledWith({}, teamId, 1, true);
            });

            it('increments blob when previous_unread_mentions < thread.unread_mentions (new mention in reply)', async () => {
                await handleThreadUpdatedEvent(serverUrl, baseMsg({
                    thread: JSON.stringify({id: threadId, unread_mentions: 2, unread_replies: 3}),
                    previous_unread_mentions: 1,
                }));

                // delta = 1 - 2 = -1 → adjustThreadInBlob subtracts -1 = adds 1
                expect(adjustThreadInBlob).toHaveBeenCalledWith({}, teamId, -1, true);
            });

            it('uses unread_replies and unread_mentions to derive hasUnreadsAfter', async () => {
                await handleThreadUpdatedEvent(serverUrl, baseMsg({
                    thread: JSON.stringify({id: threadId, unread_mentions: 0, unread_replies: 0}),
                    previous_unread_mentions: 1,
                }));

                expect(adjustThreadInBlob).toHaveBeenCalledWith({}, teamId, 1, false);
            });

            it('skips when experience API is disabled', async () => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

                await handleThreadUpdatedEvent(serverUrl, baseMsg());

                expect(adjustThreadInBlob).not.toHaveBeenCalled();
            });

            it('skips when threads are already fetched', async () => {
                jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(true);

                await handleThreadUpdatedEvent(serverUrl, baseMsg());

                expect(adjustThreadInBlob).not.toHaveBeenCalled();
            });

            it('skips when previous_unread_mentions is absent', async () => {
                await handleThreadUpdatedEvent(serverUrl, baseMsg({previous_unread_mentions: undefined}));

                expect(adjustThreadInBlob).not.toHaveBeenCalled();
            });

            it('skips when previous_unread_mentions equals thread.unread_mentions (no change)', async () => {
                await handleThreadUpdatedEvent(serverUrl, baseMsg({
                    thread: JSON.stringify({id: threadId, unread_mentions: 2, unread_replies: 1}),
                    previous_unread_mentions: 2,
                }));

                expect(adjustThreadInBlob).not.toHaveBeenCalled();
            });

            it('skips when both previous and current unread_mentions are 0 (reply with no mention)', async () => {
                await handleThreadUpdatedEvent(serverUrl, baseMsg({
                    thread: JSON.stringify({id: threadId, unread_mentions: 0, unread_replies: 3}),
                    previous_unread_mentions: 0,
                }));

                expect(adjustThreadInBlob).not.toHaveBeenCalled();
            });

            it('queues the blob op instead of writing when a sync is in flight', async () => {
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

                await handleThreadUpdatedEvent(serverUrl, baseMsg({
                    thread: JSON.stringify({id: threadId, unread_mentions: 1, unread_replies: 2, last_reply_at: 5000}),
                }));

                expect(adjustThreadInBlob).not.toHaveBeenCalled();
                expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                    op: 'adjustThread',
                    teamId,
                    mentionDelta: 1,
                    hasUnreadsAfter: true,
                    eventTimestamp: 5000,
                });
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });
        });
    });

    describe('handleThreadReadChangedEvent', () => {
        it('should update thread when thread_id is present', async () => {
            const timestamp = 1234567890;
            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp,
                    unread_mentions: 2,
                    unread_replies: 5,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('different-thread');

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(updateThread).toHaveBeenCalledWith(serverUrl, threadId, {
                unread_mentions: 2,
                unread_replies: 5,
                last_viewed_at: timestamp,
                viewed_at: timestamp,
            });
        });

        it('should not update viewed_at when thread is currently visible', async () => {
            const timestamp = 1234567890;
            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp,
                    unread_mentions: 2,
                    unread_replies: 5,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(threadId);

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(updateThread).toHaveBeenCalledWith(serverUrl, threadId, {
                unread_mentions: 2,
                unread_replies: 5,
                last_viewed_at: timestamp,
            });
        });

        it('should mark team threads as read when thread_id is missing', async () => {
            const msg = {
                data: {
                    timestamp: 1234567890,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(markTeamThreadsAsRead).toHaveBeenCalledWith(serverUrl, teamId);
        });

        it('should handle error gracefully', async () => {
            jest.mocked(updateThread).mockRejectedValue(new Error('test error'));

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(updateThread).toHaveBeenCalled();
        });

        it('adjusts the team blob thread state when thread_team_id is present and threads are not yet fetched', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                    unread_mentions: 0,
                    unread_replies: 0,
                    previous_unread_mentions: 2,
                    previous_unread_replies: 3,
                    channel_id: 'channel-id',
                    thread_team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(adjustThreadInBlob).toHaveBeenCalledWith({}, teamId, 2, false);
        });

        it('adds mentions back to the blob on mark-unread (negative delta) and keeps hasUnreads true', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                    unread_mentions: 2,
                    unread_replies: 3,
                    previous_unread_mentions: 0,
                    previous_unread_replies: 0,
                    channel_id: 'channel-id',
                    thread_team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            // delta = 0 - 2 = -2 -> mentions re-added; hasUnreadsAfter = true
            expect(adjustThreadInBlob).toHaveBeenCalledWith({}, teamId, -2, true);
        });

        it('handles a partial read where mentions remain non-zero', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                    unread_mentions: 1,
                    unread_replies: 4,
                    previous_unread_mentions: 3,
                    previous_unread_replies: 5,
                    channel_id: 'channel-id',
                    thread_team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            // delta = 3 - 1 = 2 cleared; thread still unread (mentions=1, replies=4)
            expect(adjustThreadInBlob).toHaveBeenCalledWith({}, teamId, 2, true);
        });

        it('routes DM/GM thread reads to the direct slot using thread_team_id', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                    unread_mentions: 0,
                    unread_replies: 0,
                    previous_unread_mentions: 1,
                    previous_unread_replies: 1,
                    channel_id: 'dm-channel-id',
                    thread_team_id: '', // DM/GM
                },
                broadcast: {

                    // Mobile passes the user's current team for DM/GM reads;
                    // routing must rely on thread_team_id, not broadcast.team_id.
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(adjustThreadInBlob).toHaveBeenCalledWith({}, '', 1, false);
        });

        it('skips blob adjustment when threads are already fetched for the thread team', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(true);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                    unread_mentions: 0,
                    unread_replies: 0,
                    previous_unread_mentions: 2,
                    previous_unread_replies: 3,
                    thread_team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(adjustThreadInBlob).not.toHaveBeenCalled();
        });

        it('skips blob adjustment when thread_team_id is absent (older server)', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 1234567890,
                    unread_mentions: 0,
                    unread_replies: 0,
                    previous_unread_mentions: 2,
                    previous_unread_replies: 3,

                    // thread_team_id intentionally omitted
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(adjustThreadInBlob).not.toHaveBeenCalled();
        });

        it('clears team and direct thread state in the blob on team-wide read when threads are not yet fetched', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    timestamp: 1234567890,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(markTeamThreadsAsRead).toHaveBeenCalledWith(serverUrl, teamId);
            expect(clearTeamThreadsInBlob).toHaveBeenCalledWith({}, teamId);
        });

        it('skips clearTeamThreadsInBlob on team-wide read when threads are already fetched', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(true);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            const msg = {
                data: {
                    timestamp: 1234567890,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(markTeamThreadsAsRead).toHaveBeenCalledWith(serverUrl, teamId);
            expect(clearTeamThreadsInBlob).not.toHaveBeenCalled();
        });

        it('queues an adjustThread op instead of writing when a sync is in flight', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

            const msg = {
                data: {
                    thread_id: threadId,
                    timestamp: 5000,
                    unread_mentions: 0,
                    unread_replies: 0,
                    previous_unread_mentions: 2,
                    previous_unread_replies: 3,
                    thread_team_id: teamId,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(adjustThreadInBlob).not.toHaveBeenCalled();
            expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                op: 'adjustThread',
                teamId,
                mentionDelta: 2,
                hasUnreadsAfter: false,
                eventTimestamp: 5000,
            });
            jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
        });

        it('queues a clearThreads op instead of writing when a sync is in flight (team-wide read)', async () => {
            jest.mocked(ThreadsSyncStore.hasThreadsBeenFetched).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

            const msg = {
                data: {
                    timestamp: 5000,
                },
                broadcast: {
                    team_id: teamId,
                },
            } as WebSocketMessage<ThreadReadChangedData>;

            await handleThreadReadChangedEvent(serverUrl, msg);

            expect(clearTeamThreadsInBlob).not.toHaveBeenCalled();
            expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                op: 'clearThreads',
                teamId,
                eventTimestamp: 5000,
            });
            jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
        });
    });

    describe('handleThreadFollowChangedEvent', () => {
        it('should update thread following state', async () => {
            const msg = {
                data: {
                    thread_id: threadId,
                    state: true,
                    reply_count: 5,
                },
            } as WebSocketMessage;

            await handleThreadFollowChangedEvent(serverUrl, msg);

            expect(updateThread).toHaveBeenCalledWith(serverUrl, threadId, {
                is_following: true,
                reply_count: 5,
            });
        });

        it('should handle error gracefully', async () => {
            jest.mocked(updateThread).mockRejectedValue(new Error('test error'));

            const msg = {
                data: {
                    thread_id: threadId,
                    state: false,
                    reply_count: 3,
                },
            } as WebSocketMessage;

            await handleThreadFollowChangedEvent(serverUrl, msg);

            expect(updateThread).toHaveBeenCalled();
        });
    });
});
