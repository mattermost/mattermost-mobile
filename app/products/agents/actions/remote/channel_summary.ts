// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getCurrentTeamId} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {ChannelAnalysisOptions, ChannelAnalysisResponse} from '@agents/types/api';

export type ChannelSummaryRequestOptions = ChannelAnalysisOptions & {

    // "Summarize unreads": resolved into a `since` bound before the request
    // is sent. The plugin has no unreads flag of its own; this mirrors what
    // the webapp sends.
    sinceLastViewed?: boolean;

    // The channel member's viewedAt observed by the caller BEFORE entering
    // the channel (entering runs markChannelAsViewed, advancing lastViewedAt
    // to "now" and emptying the unread window). Preferred `since` bound when
    // sinceLastViewed is set; lastViewedAt is only a fallback when absent.
    viewedAt?: number;
};

export async function requestChannelSummary(
    serverUrl: string,
    channelId: string,
    analysisType: string,
    botUsername: string,
    options?: ChannelSummaryRequestOptions,
): Promise<{data?: ChannelAnalysisResponse; error?: string}> {
    try {
        // Ensure channel exists in database and user has membership before requesting
        // This is critical for offline compatibility - switchToChannelById expects
        // the channel to already exist in the database
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let myChannel = await getMyChannel(database, channelId);
        if (!myChannel) {
            // Channel doesn't exist or user doesn't have membership - fetch and persist it
            // Use empty string for teamId - fetchMyChannel will use channel.team_id if available
            const channelResult = await fetchMyChannel(serverUrl, '', channelId);
            if (channelResult.error) {
                logDebug('[requestChannelSummary] Failed to fetch channel', getFullErrorMessage(channelResult.error));
                return {error: getFullErrorMessage(channelResult.error)};
            }
            myChannel = await getMyChannel(database, channelId);
        }

        const {sinceLastViewed, viewedAt, ...analysisOptions} = options ?? {};
        if (sinceLastViewed) {
            const since = viewedAt || myChannel?.lastViewedAt;
            if (!since) {
                // Never fall back to the Unix epoch — that would summarize the
                // entire available channel history instead of the unreads.
                logDebug('[requestChannelSummary] No viewedAt or membership lastViewedAt available for unreads bound');
                return {error: 'Unable to determine channel last viewed time'};
            }
            analysisOptions.since = new Date(since).toISOString();
        }

        // The server uses team_id to set the LLM context team for DM/GM
        // channels (and ignores it otherwise); web always sends the current
        // team id, so mirror that.
        const currentTeamId = await getCurrentTeamId(database);
        if (currentTeamId) {
            analysisOptions.team_id = currentTeamId;
        }

        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doChannelAnalysis(channelId, analysisType, botUsername, analysisOptions);

        if (!result?.postid || !result?.channelid) {
            logDebug('[requestChannelSummary] Invalid response - missing postid or channelid');
            return {error: 'Invalid response from server'};
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestChannelSummary]', error);
        return {error: getFullErrorMessage(error)};
    }
}

