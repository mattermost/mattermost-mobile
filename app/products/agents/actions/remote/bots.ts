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

// handleAIBots diffs against rows read outside the writer, so fetches and
// clears for a server run one at a time. A fetch requested while another sync
// runs is queued rather than joined: the running one may predate the change
// that triggered the request.
type BotSyncQueue = {tail: Promise<unknown>; queuedFetch?: Promise<FetchAIBotsResult>};
const syncQueues = new Map<string, BotSyncQueue>();

function enqueueBotSync<T>(serverUrl: string, task: () => Promise<T>): Promise<T> {
    const queue = syncQueues.get(serverUrl) ?? {tail: Promise.resolve()};
    const result = queue.tail.then(task, task);
    queue.tail = result;
    syncQueues.set(serverUrl, queue);
    const cleanup = () => {
        if (syncQueues.get(serverUrl)?.tail === result) {
            syncQueues.delete(serverUrl);
        }
    };
    result.then(cleanup, cleanup);
    return result;
}

// Plugins before 2.5 don't send isDefault; they list the default bot first.
function withDefaultFlag(bots: LLMBot[]): LLMBot[] {
    if (bots.length === 0 || bots.some((bot) => bot.isDefault)) {
        return bots;
    }
    return [{...bots[0], isDefault: true}, ...bots.slice(1)];
}

/**
 * Fetch all AI bots from the server and store them in the database.
 * Calls made while a sync is running share a single follow-up request.
 * @param serverUrl The server URL
 * @returns {bots, searchEnabled, allowUnsafeLinks, error} - Bot configuration on success, error on failure
 */
export function fetchAIBots(serverUrl: string): Promise<FetchAIBotsResult> {
    const queued = syncQueues.get(serverUrl)?.queuedFetch;
    if (queued) {
        return queued;
    }
    const request: Promise<FetchAIBotsResult> = enqueueBotSync(serverUrl, () => {
        const queue = syncQueues.get(serverUrl);
        if (queue?.queuedFetch === request) {
            queue.queuedFetch = undefined;
        }
        return doFetchAIBots(serverUrl);
    });
    const queue = syncQueues.get(serverUrl);
    if (queue) {
        queue.queuedFetch = request;
    }
    return request;
}

/**
 * Remove every stored bot for a server, e.g. when the plugin is disabled or
 * an unsupported version is enabled. Serialized with fetchAIBots so a fetch
 * already running can't write the bots back afterwards.
 */
export function clearAIBots(serverUrl: string): Promise<{data?: boolean; error?: unknown}> {
    const request = enqueueBotSync(serverUrl, async () => {
        try {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            await operator.handleAIBots({bots: [], prepareRecordsOnly: false});
            return {data: true};
        } catch (error) {
            logError('[clearAIBots]', getFullErrorMessage(error));
            return {error};
        }
    });

    // A fetch requested after this clear must run after it, not join one
    // queued before it.
    const queue = syncQueues.get(serverUrl);
    if (queue) {
        queue.queuedFetch = undefined;
    }
    return request;
}

async function doFetchAIBots(serverUrl: string): Promise<FetchAIBotsResult> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAIBots();
        const bots = withDefaultFlag(response.bots ?? []);

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
