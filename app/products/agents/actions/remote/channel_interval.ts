// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {switchToAgentResponseChannel} from './response_channel';

import type {ChannelIntervalResponse} from '@agents/types/api';

/**
 * Ask an agent to summarize the channel messages since `startTime` (unix
 * milliseconds — the channel's lastViewedAt, i.e. where the New Messages line
 * sits). The plugin streams the result into a DM with the bot and returns
 * that DM's post/channel ids; on success the app switches into it.
 */
export async function requestChannelInterval(
    serverUrl: string,
    channelId: string,
    startTime: number,
    presetPrompt: string,
    botUsername: string,
): Promise<{data?: ChannelIntervalResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doChannelInterval(channelId, startTime, presetPrompt, botUsername);

        const {error} = await switchToAgentResponseChannel(serverUrl, result);
        if (error) {
            return {error};
        }

        return {data: result};
    } catch (error) {
        const errorMessage = getFullErrorMessage(error);
        logError('[requestChannelInterval] Failed to request channel interval', errorMessage);
        return {error: errorMessage};
    }
}
