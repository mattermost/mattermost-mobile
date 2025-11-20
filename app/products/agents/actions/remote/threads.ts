// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {AIThread} from '@agents/types';

/**
 * Fetch all AI threads (conversations with agent bots) from the server
 * @param serverUrl The server URL
 * @returns {threads, error} - Array of AI threads on success, error on failure
 */
export async function fetchAIThreads(
    serverUrl: string,
): Promise<{threads?: AIThread[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const url = '/plugins/mattermost-ai/ai_threads';

        const response = await client.doFetch(url, {method: 'GET'}) as unknown as AIThread[];

        return {threads: response};
    } catch (error) {
        logError('Failed to fetch AI threads', error);
        return {error: getFullErrorMessage(error)};
    }
}
