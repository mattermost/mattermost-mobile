// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {switchToAgentResponseChannel} from './response_channel';

import type {ChannelAnalysisResponse} from '@agents/types/api';

/**
 * Run an analysis request (channel, interval or thread) and switch to the bot
 * DM its answer streams into.
 */
export async function runAnalysisRequest(
    serverUrl: string,
    caller: string,
    request: () => Promise<ChannelAnalysisResponse>,
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        const result = await request();

        const {error} = await switchToAgentResponseChannel(serverUrl, result);
        if (error) {
            return {error};
        }

        return {data: result};
    } catch (error) {
        const errorMessage = getFullErrorMessage(error);
        logError(`[${caller}] Analysis request failed`, errorMessage);
        return {error: errorMessage};
    }
}
