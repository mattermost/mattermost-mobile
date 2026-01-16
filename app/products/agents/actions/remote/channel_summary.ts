// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {fetchPostById} from '@actions/remote/post';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

type ChannelAnalysisOptions = {
    since?: string;
    until?: string;
    days?: number;
    prompt?: string;
};

type ChannelAnalysisResponse = {
    postid: string;
    channelid: string;
};

export async function requestChannelSummary(
    serverUrl: string,
    channelId: string,
    analysisType: string,
    botUsername: string,
    options?: ChannelAnalysisOptions,
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doChannelAnalysis(channelId, analysisType, botUsername, options);

        if (!result?.postid || !result?.channelid) {
            return {error: 'Invalid response from server'};
        }

        // Ensure post is persisted to database for offline compatibility
        await fetchPostById(serverUrl, result.postid);

        // Ensure channel exists in database and user has membership before switching
        // This is critical for offline compatibility - switchToChannelById expects
        // the channel to already exist in the database
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, result.channelid);
        if (!myChannel) {
            // Channel doesn't exist or user doesn't have membership - fetch and persist it
            // Use empty string for teamId - fetchMyChannel will use channel.team_id if available
            const channelResult = await fetchMyChannel(serverUrl, '', result.channelid);
            if (channelResult.error) {
                return {error: getFullErrorMessage(channelResult.error)};
            }
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestChannelSummary]', error);
        return {error: getFullErrorMessage(error)};
    }
}

