// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

export enum ChannelAccessLevel {
    All = 0,
    Allow = 1,
    Block = 2,
}

export enum UserAccessLevel {
    All = 0,
    Allow = 1,
    Block = 2,
}

export interface LLMBot {
    id: string;
    displayName: string;
    username: string;
    lastIconUpdate: number;
    dmChannelID: string;
    channelAccessLevel: ChannelAccessLevel;
    channelIDs: string[];
    userAccessLevel: UserAccessLevel;
    userIDs: string[];
    teamIDs: string[];
}

interface AIBotsResponse {
    bots: LLMBot[];
    searchEnabled: boolean;
    allowUnsafeLinks: boolean;
}

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
        const url = '/plugins/mattermost-ai/ai_bots';

        const response = await client.doFetch(url, {method: 'GET'}) as unknown as AIBotsResponse;

        return {
            bots: response.bots,
            searchEnabled: response.searchEnabled,
            allowUnsafeLinks: response.allowUnsafeLinks,
        };
    } catch (error) {
        logError('Failed to fetch AI bots', error);
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
        logError('Failed to get bot direct channel', error);
        return {error: getFullErrorMessage(error)};
    }
}
