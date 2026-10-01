// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentTeamId} from '@queries/servers/system';

import {runAnalysisRequest} from './analysis_request';

import type {ChannelAnalysisOptions} from '@agents/types/api';

export function requestChannelSummary(
    serverUrl: string,
    channelId: string,
    analysisType: string,
    botUsername: string,
    options: ChannelAnalysisOptions = {},
) {
    return runAnalysisRequest(serverUrl, 'requestChannelSummary', async () => {
        // The server uses team_id to set the LLM context team for DM/GM
        // channels (and ignores it otherwise); web always sends the current
        // team id, so mirror that.
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentTeamId = await getCurrentTeamId(database);
        const analysisOptions = currentTeamId ? {...options, team_id: currentTeamId} : options;

        return NetworkManager.getClient(serverUrl).doChannelAnalysis(channelId, analysisType, botUsername, analysisOptions);
    });
}
