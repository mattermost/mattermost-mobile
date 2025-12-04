// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, processReceivedThreads, updateThread} from '@actions/local/thread';
import DatabaseManager from '@database/manager';
import {getCurrentTeamId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';

import {handleThreadUpdatedEvent, handleThreadReadChangedEvent, handleThreadFollowChangedEvent} from './threads';

jest.mock('@actions/local/thread');
jest.mock('@database/manager');
jest.mock('@queries/servers/system');
jest.mock('@store/ephemeral_store');

describe('WebSocket Threads Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const teamId = 'team-id';
    const threadId = 'thread-id';

    beforeEach(async () => {
        jest.clearAllMocks();

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
