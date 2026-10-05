// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {runAnalysisRequest} from './analysis_request';

/**
 * Ask an agent to analyze a thread (summarize, find action items, or find
 * open questions). The plugin streams the result into a DM with the bot and
 * returns that DM's post/channel ids; on success the app switches into it.
 */
export function requestThreadAnalysis(
    serverUrl: string,
    postId: string,
    analysisType: string,
    botUsername: string,
) {
    return runAnalysisRequest(serverUrl, 'requestThreadAnalysis', () => (
        NetworkManager.getClient(serverUrl).doThreadAnalysis(postId, analysisType, botUsername)
    ));
}
