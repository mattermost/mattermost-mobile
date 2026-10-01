// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMissingProfilesByIds} from '@actions/remote/user';
import {setAgentsConfig} from '@agents/store/agents_config';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {LLMBot} from '@agents/types';

type FetchAIBotsResult = {bots?: LLMBot[]; searchEnabled?: boolean; allowUnsafeLinks?: boolean; error?: unknown};

// handleAIBots diffs against rows read outside the writer, so overlapping
// syncs would both try to create the same records.
const inFlight = new Map<string, Promise<FetchAIBotsResult>>();

/**
 * Fetch all AI bots from the server and store them in the database.
 * Concurrent calls for the same server share one request.
 * @param serverUrl The server URL
 * @returns {bots, searchEnabled, allowUnsafeLinks, error} - Bot configuration on success, error on failure
 */
export function fetchAIBots(serverUrl: string): Promise<FetchAIBotsResult> {
    let request = inFlight.get(serverUrl);
    if (!request) {
        request = doFetchAIBots(serverUrl).finally(() => inFlight.delete(serverUrl));
        inFlight.set(serverUrl, request);
    }
    return request;
}

async function doFetchAIBots(serverUrl: string): Promise<FetchAIBotsResult> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAIBots();
        const bots = response.bots ?? [];

        // Persist the global unsafe-links config so agent renderers can gate
        // markdown links. Partial update — pluginEnabled is owned by
        // checkIsAgentsPluginEnabled and stays untouched.
        setAgentsConfig(serverUrl, {allowUnsafeLinks: Boolean(response.allowUnsafeLinks)});

        // Store bots in database and remove any that no longer exist on the server
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleAIBots({
            bots,
            prepareRecordsOnly: false,
        });

        // Refresh bot user profiles to keep User.deleteAt current.
        // This prevents stale deactivation status from showing "archived channel" in agent chat.
        // Only fetches profiles not already in the DB.
        const botUserIds = bots.map((b) => b.id).filter(Boolean);
        if (botUserIds.length) {
            try {
                await fetchMissingProfilesByIds(serverUrl, botUserIds);
            } catch (profileError) {
                logDebug('[fetchAIBots] Failed to refresh bot user profiles', getFullErrorMessage(profileError));
            }
        }

        return {
            bots,
            searchEnabled: response.searchEnabled,
            allowUnsafeLinks: response.allowUnsafeLinks,
        };
    } catch (error) {
        const errorMessage = getFullErrorMessage(error);
        logError('[fetchAIBots] Failed to fetch AI bots', errorMessage);
        return {error: errorMessage};
    }
}
