// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {ChannelAnalysisResponse} from '@agents/types/api';

/**
 * Switch to the bot DM an analysis request streams its answer into. The DM
 * may have just been created server-side, and switchToChannelById expects the
 * membership to exist locally, so fetch it first when it hasn't arrived over
 * the websocket yet.
 */
export async function switchToAgentResponseChannel(serverUrl: string, response: ChannelAnalysisResponse | undefined): Promise<{error?: string}> {
    if (!response?.postid || !response?.channelid) {
        logDebug('[switchToAgentResponseChannel] Invalid response - missing postid or channelid');
        return {error: 'Invalid response from server'};
    }

    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const myChannel = await getMyChannel(database, response.channelid);
    if (!myChannel) {
        const {error} = await fetchMyChannel(serverUrl, '', response.channelid);
        if (error) {
            logDebug('[switchToAgentResponseChannel] Failed to fetch response DM channel', getFullErrorMessage(error));
            return {error: getFullErrorMessage(error)};
        }
    }

    await switchToChannelById(serverUrl, response.channelid);
    return {};
}
