// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, processReceivedThreads, updateThread} from '@actions/local/thread';
import DatabaseManager from '@database/manager';
import {getCurrentTeamId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';

export async function handleThreadUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const thread: Thread = JSON.parse(msg.data.thread);
        let teamId = msg.broadcast.team_id;

        if (!teamId) {
            teamId = await getCurrentTeamId(database);
        }

        // Mark it as following
        thread.is_following = true;
        processReceivedThreads(serverUrl, [thread], teamId);
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadReadChangedEvent(serverUrl: string, msg: WebSocketMessage<ThreadReadChangedData>): Promise<void> {
    try {
        const {thread_id, timestamp, unread_mentions, unread_replies} = msg.data;
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
        } else {
            await markTeamThreadsAsRead(serverUrl, msg.broadcast.team_id);
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
