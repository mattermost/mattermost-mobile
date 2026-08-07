// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

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

        if (!result?.postid || !result?.channelid) {
            logDebug('[requestThreadAnalysis] Invalid response - missing postid or channelid');
            return {error: 'Invalid response from server'};
        }

        // The bot DM may have just been created server-side (StreamToNewDM);
        // switchToChannelById expects the channel membership to exist locally,
        // so fetch it first when it hasn't arrived over the websocket yet.
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, result.channelid);
        if (!myChannel) {
            const channelResult = await fetchMyChannel(serverUrl, '', result.channelid);
            if (channelResult.error) {
                logDebug('[requestThreadAnalysis] Failed to fetch analysis DM channel', getFullErrorMessage(channelResult.error));
                return {error: getFullErrorMessage(channelResult.error)};
            }
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestThreadAnalysis]', error);
        return {error: getFullErrorMessage(error)};
    }
}
