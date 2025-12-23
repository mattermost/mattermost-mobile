// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {LLMBot} from '@agents/types';

export type {LLMBot};

/**
 * Fetch all AI bots from the server
 * @param serverUrl The server URL
 * @returns {bots, searchEnabled, allowUnsafeLinks, error} - Bot configuration on success, error on failure
 */
export async function fetchAIBots(
    serverUrl: string,
): Promise<{bots?: LLMBot[]; searchEnabled?: boolean; allowUnsafeLinks?: boolean; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAIBots();

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

/**
 * Get or create a DM channel with a bot
 * @param serverUrl The server URL
 * @param currentUserId The current user's ID
 * @param botUserId The bot's user ID
 * @returns {channelId, error} - DM channel ID on success, error on failure
 */
export async function getBotDirectChannel(
    serverUrl: string,
    currentUserId: string,
    botUserId: string,
): Promise<{channelId?: string; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);

        // Create or get existing DM channel
        const channel = await client.createDirectChannel([currentUserId, botUserId]);

        return {channelId: channel.id};
    } catch (error) {
        logError('[getBotDirectChannel] Failed to get bot direct channel', error);
        return {error: getFullErrorMessage(error)};
    }
}
