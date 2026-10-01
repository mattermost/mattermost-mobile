// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentTeamId} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {switchToAgentResponseChannel} from './response_channel';

import type {ChannelAnalysisOptions, ChannelAnalysisResponse} from '@agents/types/api';

export async function requestChannelSummary(
    serverUrl: string,
    channelId: string,
    analysisType: string,
    botUsername: string,
    options: ChannelAnalysisOptions = {},
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        // The server uses team_id to set the LLM context team for DM/GM
        // channels (and ignores it otherwise); web always sends the current
        // team id, so mirror that.
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentTeamId = await getCurrentTeamId(database);
        const analysisOptions = currentTeamId ? {...options, team_id: currentTeamId} : options;

        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doChannelAnalysis(channelId, analysisType, botUsername, analysisOptions);

        const {error} = await switchToAgentResponseChannel(serverUrl, result);
        if (error) {
            return {error};
        }

        return {data: result};
    } catch (error) {
        const errorMessage = getFullErrorMessage(error);
        logError('[requestChannelSummary] Failed to request channel summary', errorMessage);
        return {error: errorMessage};
    }
}
