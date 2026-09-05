// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {ChannelIntervalResponse} from '@agents/types/api';

/**
 * Ask an agent to summarize the channel messages since `startTime` (unix
 * milliseconds — the channel's lastViewedAt, i.e. where the New Messages line
 * sits). The plugin streams the result into a DM with the bot and returns
 * that DM's post/channel ids; on success the app switches into it.
 *
 * end_time is always 0 ("until present"): the server's 14-day-cap validation
 * is buggy (it compares millisecond timestamps against a seconds constant),
 * so any nonzero end_time range over ~20 minutes gets a 400. The client
 * hard-codes it; there is no end time parameter.
 */
export async function requestChannelInterval(
    serverUrl: string,
    channelId: string,
    startTime: number,
    presetPrompt: string,
    botUsername: string,
): Promise<{data?: ChannelIntervalResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.doChannelInterval(channelId, startTime, presetPrompt, botUsername);

        if (!result?.postid || !result?.channelid) {
            logDebug('[requestChannelInterval] Invalid response - missing postid or channelid');
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
                logDebug('[requestChannelInterval] Failed to fetch summary DM channel', getFullErrorMessage(channelResult.error));
                return {error: getFullErrorMessage(channelResult.error)};
            }
        }

        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestChannelInterval]', error);
        return {error: getFullErrorMessage(error)};
    }
}
