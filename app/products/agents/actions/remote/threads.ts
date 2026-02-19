// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {AIThread} from '@agents/types';

/**
 * Fetch all AI threads (conversations with agent bots) from the server and store them in the database
 * @param serverUrl The server URL
 * @returns {threads, error} - Array of AI threads on success, error on failure
 */
export async function fetchAIThreads(
    serverUrl: string,
): Promise<{threads?: AIThread[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAIThreads();

        // Handle null/undefined response from API - treat as empty array
        const threads = Array.isArray(response) ? response : [];

        // Store threads in database and remove any that no longer exist on the server
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleAIThreads({
            threads,
            prepareRecordsOnly: false,
            deleteNotPresent: true,
        });

        return {threads};
    } catch (error) {
        logError('[fetchAIThreads] Failed to fetch AI threads', error);
        return {error: getFullErrorMessage(error)};
    }
}
