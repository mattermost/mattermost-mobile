// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {runAnalysisRequest} from './analysis_request';

/**
 * Ask an agent to summarize the channel messages since `startTime` (unix
 * milliseconds — the channel member's viewedAt, i.e. where the New Messages
 * line sits). The plugin streams the result into a DM with the bot and returns
 * that DM's post/channel ids; on success the app switches into it.
 */
export function requestChannelInterval(
    serverUrl: string,
    channelId: string,
    startTime: number,
    presetPrompt: string,
    botUsername: string,
) {
    return runAnalysisRequest(serverUrl, 'requestChannelInterval', () => (
        NetworkManager.getClient(serverUrl).doChannelInterval(channelId, startTime, presetPrompt, botUsername)
    ));
}
