// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {AIThread, RawAIThread} from '@agents/types';

// Threads are keyed by their root post. Returns null for threadless
// conversations so callers can filter them out.
function normaliseThread(raw: RawAIThread): AIThread | null {
    if (!raw.root_post_id) {
        return null;
    }

    return {
        id: raw.root_post_id,
        title: raw.title ?? '',
        channel_id: raw.channel_id ?? '',
        turn_count: raw.turn_count ?? 0,
        update_at: raw.update_at ?? 0,
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
        const errorMessage = getFullErrorMessage(error);
        logError('[fetchAIThreads] Failed to fetch AI threads', errorMessage);
        return {error: errorMessage};
    }
}
