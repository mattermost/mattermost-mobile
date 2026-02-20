// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {LLMBot} from '@agents/types';

/**
 * Fetch all AI bots from the server and store them in the database
 * @param serverUrl The server URL
 * @returns {bots, searchEnabled, allowUnsafeLinks, error} - Bot configuration on success, error on failure
 */
export async function fetchAIBots(
    serverUrl: string,
): Promise<{bots?: LLMBot[]; searchEnabled?: boolean; allowUnsafeLinks?: boolean; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAIBots();

        // Store bots in database and remove any that no longer exist on the server
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleAIBots({
            bots: response.bots,
            prepareRecordsOnly: false,
        });

        // Refresh bot user profiles to keep User.deleteAt current.
        // This prevents stale deactivation status from showing "archived channel" in agent chat.
        const botUserIds = (response.bots || []).map((b) => b.id).filter(Boolean);
        if (botUserIds.length) {
            try {
                const profiles = await client.getProfilesByIds(botUserIds);
                if (profiles.length) {
                    await operator.handleUsers({users: profiles, prepareRecordsOnly: false});
                }
            } catch (profileError) {
                logDebug('[fetchAIBots] Failed to refresh bot user profiles', getFullErrorMessage(profileError));
            }
        }

        return {
            bots: response.bots,
            searchEnabled: response.searchEnabled,
            allowUnsafeLinks: response.allowUnsafeLinks,
        };
    } catch (error) {
        logError('[fetchAIBots] Failed to fetch AI bots', error);
        return {error: getFullErrorMessage(error)};
    }
}
