// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchPostById} from '@actions/remote/post';
import NetworkManager from '@managers/network_manager';
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

        await fetchPostById(serverUrl, result.postid);
        await switchToChannelById(serverUrl, result.channelid);

        return {data: result};
    } catch (error) {
        logError('[requestChannelSummary]', error);
        return {error: getFullErrorMessage(error)};
    }
}

