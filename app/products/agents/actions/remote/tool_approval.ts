// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

/**
 * Submit tool approval decisions to the server
 * @param serverUrl The server URL
 * @param postId The post ID containing the tool calls
 * @param acceptedToolIds Array of tool IDs that were approved
 * @returns {error} on failure
 */
export async function submitToolApproval(
    serverUrl: string,
    postId: string,
    acceptedToolIds: string[],
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const url = `/plugins/mattermost-ai/post/${postId}/tool_call`;

        await client.doFetch(
            url,
            {
                method: 'POST',
                body: JSON.stringify({
                    accepted_tool_ids: acceptedToolIds,
                }),
            },
        );

        return {};
    } catch (error) {
        logError('Failed to submit tool approval', error);
        return {error: getFullErrorMessage(error)};
    }
}
