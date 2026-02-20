// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import type AiThreadModel from '@agents/types/database/models/ai_thread';

const {AI_THREAD} = AGENTS_TABLES;

/**
 * Returns a query for all AI threads sorted by update_at descending (most recent first).
 */
export function queryAIThreads(database: Database) {
    return database.get<AiThreadModel>(AI_THREAD).query(
        Q.sortBy('update_at', Q.desc),
    );
}

/**
 * Returns an observable for all AI threads sorted by update_at descending.
 */
export function observeAIThreads(database: Database) {
    return queryAIThreads(database).observeWithColumns(['update_at', 'reply_count', 'message', 'title']);
}

/**
 * Returns a query for AI threads by channel ID.
 */
export function queryAIThreadsByChannelId(database: Database, channelId: string) {
    return database.get<AiThreadModel>(AI_THREAD).query(
        Q.where('channel_id', channelId),
        Q.sortBy('update_at', Q.desc),
    );
}

/**
 * Returns an observable for AI threads by channel ID.
 */
export function observeAIThreadsByChannelId(database: Database, channelId: string) {
    return queryAIThreadsByChannelId(database, channelId).observeWithColumns(['update_at', 'reply_count']);
}

/**
 * Returns a query for an AI thread by ID.
 */
export function queryAIThreadById(database: Database, threadId: string) {
    return database.get<AiThreadModel>(AI_THREAD).query(
        Q.where('id', threadId),
        Q.take(1),
    );
}

/**
 * Returns an observable for an AI thread by ID.
 */
export function observeAIThreadById(database: Database, threadId: string) {
    return queryAIThreadById(database, threadId).observe().pipe(
        switchMap((threads) => {
            return threads.length ? threads[0].observe() : of$(undefined);
        }),
    );
}

/**
 * Gets an AI thread by ID from the database.
 */
export async function getAIThreadById(database: Database, threadId: string) {
    try {
        const thread = await database.get<AiThreadModel>(AI_THREAD).find(threadId);
        return thread;
    } catch {
        return undefined;
    }
}

/**
 * Gets all AI threads from the database.
 */
export async function getAllAIThreads(database: Database) {
    return queryAIThreads(database).fetch();
}
