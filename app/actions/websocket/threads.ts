// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {processThreadsWithPostsFetched, updateThreadFollowing, updateThreadReadChanged} from '@actions/local/thread';
import DatabaseManager from '@database/manager';

import type {WebSocketMessage} from '@typings/api/websocket';

export async function handleThreadUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const thread = JSON.parse(msg.data.thread) as Thread;
        thread.is_following = true; // Mark as following
        processThreadsWithPostsFetched(serverUrl, [thread]);
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadReadChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const operator = database?.operator;
        if (operator) {
            const {thread_id, timestamp, unread_mentions, unread_replies} = msg.data as {
                thread_id: string;
                timestamp: number;
                unread_mentions: number;
                unread_replies: number;
            };
            updateThreadReadChanged(serverUrl, thread_id, timestamp, unread_mentions, unread_replies);
        }
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadFollowChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const operator = database?.operator;
        if (operator) {
            const {reply_count, state, thread_id} = msg.data as {
                reply_count: number;
                state: boolean;
                thread_id: string;
            };
            updateThreadFollowing(serverUrl, thread_id, state, reply_count);
        }
    } catch (error) {
        // Do nothing
    }
}
