// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {ChannelAnalysisResponse} from '@agents/types/api';

/**
 * Ask an agent to analyze a thread (summarize / find action items / find open
 * questions). The result streams into the requester's DM with the agent, so on
 * success we switch there — mirroring requestChannelSummary.
 */
export async function requestThreadAnalysis(
    serverUrl: string,
    postId: string,
    analysisType: string,
    botUsername: string,
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doThreadAnalysis(postId, analysisType, botUsername);

        if (!result?.postid || !result?.channelid) {
            logDebug('[requestThreadAnalysis] Invalid response - missing postid or channelid');
            return {error: 'Invalid response from server'};
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestThreadAnalysis]', error);
        return {error: getFullErrorMessage(error)};
    }
}
