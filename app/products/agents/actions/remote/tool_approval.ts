// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {ToolAnswer} from '@agents/types';

/**
 * Submit tool approval decisions to the server
 * @param serverUrl The server URL
 * @param postId The post ID containing the tool calls
 * @param acceptedToolIds Array of tool IDs that were approved
 * @param toolAnswers Answers for accepted user-interaction tool calls, keyed by tool call ID
 * @returns {error} on failure
 */
export async function submitToolApproval(
    serverUrl: string,
    postId: string,
    acceptedToolIds: string[],
    toolAnswers?: {[toolId: string]: ToolAnswer},
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.submitToolApproval(postId, acceptedToolIds, toolAnswers);
        return {};
    } catch (error) {
        logError('[submitToolApproval]', error);
        return {error: getFullErrorMessage(error)};
    }
}
