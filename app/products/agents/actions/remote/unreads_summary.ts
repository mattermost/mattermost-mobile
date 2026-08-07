// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {ChannelAnalysisResponse} from '@agents/types/api';

/**
 * Ask an agent to analyze a channel's unread window ("catch me up"):
 * start_time is the New Messages boundary and end_time 0 means "until now".
 * The result streams into the requester's DM with the agent, so on success
 * we switch there — mirroring requestChannelSummary/requestThreadAnalysis.
 */
export async function requestUnreadsSummary(
    serverUrl: string,
    channelId: string,
    startTime: number,
    presetPrompt: string,
    botUsername: string,
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.getChannelInterval(channelId, botUsername, startTime, 0, presetPrompt);

        if (!result?.postid || !result?.channelid) {
            logDebug('[requestUnreadsSummary] Invalid response - missing postid or channelid');
            return {error: 'Invalid response from server'};
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestUnreadsSummary]', error);
        return {error: getFullErrorMessage(error)};
    }
}
