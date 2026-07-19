// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, processReceivedThreads, updateThread} from '@actions/local/thread';
import DatabaseManager from '@database/manager';
import {adjustThreadInBlob, clearTeamThreadsInBlob, getCurrentTeamId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import SyncBlobQueue from '@store/sync_blob_queue';
import ThreadsSyncStore from '@store/threads_sync_store';

export async function handleThreadUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const thread: Thread = JSON.parse(msg.data.thread);
        let teamId = msg.broadcast.team_id;

        if (!teamId) {
            teamId = await getCurrentTeamId(database);
        }

        // Mark it as following
        thread.is_following = true;
        processReceivedThreads(serverUrl, [thread], teamId);

        const previousUnreadMentions: number | undefined = msg.data.previous_unread_mentions;
        if (
            EphemeralStore.getExperienceAPIEnabled(serverUrl) &&
            previousUnreadMentions !== undefined &&
            previousUnreadMentions !== thread.unread_mentions &&
            !ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamId)
        ) {
            const mentionDelta = previousUnreadMentions - thread.unread_mentions;
            const hasUnreadsAfter = thread.unread_replies > 0 || thread.unread_mentions > 0;
            if (SyncBlobQueue.isSyncing(serverUrl)) {
                SyncBlobQueue.queueBlobOp(serverUrl, {op: 'adjustThread', teamId, mentionDelta, hasUnreadsAfter, eventTimestamp: thread.last_reply_at});
                return;
            }
            await adjustThreadInBlob(operator, teamId, mentionDelta, hasUnreadsAfter);
        }
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadReadChangedEvent(serverUrl: string, msg: WebSocketMessage<ThreadReadChangedData>): Promise<void> {
    try {
        const {thread_id, timestamp, unread_mentions, unread_replies, previous_unread_mentions, thread_team_id} = msg.data;
        if (thread_id) {
            const data: Partial<ThreadWithViewedAt> = {
                unread_mentions,
                unread_replies,
                last_viewed_at: timestamp,
            };

            // Do not update viewing data if the user is currently in the same thread
            const isThreadVisible = EphemeralStore.getCurrentThreadId() === thread_id;
            if (!isThreadVisible) {
                data.viewed_at = timestamp;
            }

            await updateThread(serverUrl, thread_id, data);

            // thread_team_id is the channel's TeamId; '' routes to the direct slot.
            if (EphemeralStore.getExperienceAPIEnabled(serverUrl) &&
                thread_team_id !== undefined && previous_unread_mentions !== undefined &&
                !ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, thread_team_id)) {
                const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const mentionDelta = previous_unread_mentions - unread_mentions;
                const hasUnreadsAfter = unread_replies > 0 || unread_mentions > 0;
                if (SyncBlobQueue.isSyncing(serverUrl)) {
                    SyncBlobQueue.queueBlobOp(serverUrl, {op: 'adjustThread', teamId: thread_team_id, mentionDelta, hasUnreadsAfter, eventTimestamp: timestamp});
                    return;
                }
                await adjustThreadInBlob(operator, thread_team_id, mentionDelta, hasUnreadsAfter);
            }
        } else {
            const teamId = msg.broadcast.team_id;
            await markTeamThreadsAsRead(serverUrl, teamId);

            // MarkAllAsReadByTeam clears DM/GM threads too — zero both slots.
            if (EphemeralStore.getExperienceAPIEnabled(serverUrl) &&
                !ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamId)) {
                const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                if (SyncBlobQueue.isSyncing(serverUrl)) {
                    SyncBlobQueue.queueBlobOp(serverUrl, {op: 'clearThreads', teamId, eventTimestamp: timestamp});
                    return;
                }
                await clearTeamThreadsInBlob(operator, teamId);
            }
        }
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadFollowChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {reply_count, state, thread_id} = msg.data as {
                reply_count: number;
                state: boolean;
                thread_id: string;
            };
        await updateThread(serverUrl, thread_id, {
            is_following: state,
            reply_count,
        });
    } catch (error) {
        // Do nothing
    }
}
