// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {AIThread, RawAIThread} from '@agents/types';

// plugin >= 2.0 carries root_post_id; plugin < 2.0 has the post id in `id`.
// Returns null for threadless conversations so callers can filter them out.
function normaliseThread(raw: RawAIThread): AIThread | null {
    const hasRootPostField = 'root_post_id' in raw;
    const postId = hasRootPostField ? raw.root_post_id : raw.id;
    if (!postId) {
        return null;
    }

    return {
        id: postId,
        message: raw.message ?? '',
        title: raw.title ?? '',
        channel_id: raw.channel_id ?? '',
        reply_count: raw.reply_count ?? 0,
        update_at: raw.update_at ?? 0,
        root_post_id: raw.root_post_id ?? undefined,
        bot_id: raw.bot_id,
    };
}

export async function fetchAIThreads(
    serverUrl: string,
): Promise<{threads?: AIThread[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAIThreads();

        const rawThreads = response ?? [];
        const threads: AIThread[] = [];
        for (const raw of rawThreads) {
            const normalised = normaliseThread(raw);
            if (normalised) {
                threads.push(normalised);
            }
        }

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleAIThreads({
            threads,
            prepareRecordsOnly: false,
        });

        return {threads};
    } catch (error) {
        logError('[fetchAIThreads] Failed to fetch AI threads', error);
        return {error: getFullErrorMessage(error)};
    }
}
