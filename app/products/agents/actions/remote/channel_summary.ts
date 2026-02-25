// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {ChannelAnalysisOptions, ChannelAnalysisResponse} from '@agents/types/api';

export async function requestChannelSummary(
    serverUrl: string,
    channelId: string,
    analysisType: string,
    botUsername: string,
    options?: ChannelAnalysisOptions,
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        // Ensure channel exists in database and user has membership before requesting
        // This is critical for offline compatibility - switchToChannelById expects
        // the channel to already exist in the database
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, channelId);
        if (!myChannel) {
            // Channel doesn't exist or user doesn't have membership - fetch and persist it
            // Use empty string for teamId - fetchMyChannel will use channel.team_id if available
            const channelResult = await fetchMyChannel(serverUrl, '', channelId);
            if (channelResult.error) {
                return {error: getFullErrorMessage(channelResult.error)};
            }
        }

        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doChannelAnalysis(channelId, analysisType, botUsername, options);

        if (!result?.postid || !result?.channelid) {
            return {error: 'Invalid response from server'};
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestChannelSummary]', error);
        return {error: getFullErrorMessage(error)};
    }
}

