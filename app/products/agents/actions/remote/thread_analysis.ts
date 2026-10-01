// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {switchToAgentResponseChannel} from './response_channel';

import type {ThreadAnalysisResponse} from '@agents/types/api';

/**
 * Ask an agent to analyze a thread (summarize, find action items, or find
 * open questions). The plugin streams the result into a DM with the bot and
 * returns that DM's post/channel ids; on success the app switches into it.
 */
export async function requestThreadAnalysis(
    serverUrl: string,
    postId: string,
    analysisType: string,
    botUsername: string,
): Promise<{data?: ThreadAnalysisResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doThreadAnalysis(postId, analysisType, botUsername);

        const {error} = await switchToAgentResponseChannel(serverUrl, result);
        if (error) {
            return {error};
        }

        return {data: result};
    } catch (error) {
        const errorMessage = getFullErrorMessage(error);
        logError('[requestThreadAnalysis] Failed to request thread analysis', errorMessage);
        return {error: errorMessage};
    }
}
