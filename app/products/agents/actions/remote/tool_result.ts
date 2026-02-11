// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

/**
 * Submit tool result decisions to the server
 * @param serverUrl The server URL
 * @param postId The post ID containing the tool calls
 * @param acceptedToolIds Array of tool IDs whose results were approved to share
 * @returns {error} on failure
 */
export async function submitToolResult(
    serverUrl: string,
    postId: string,
    acceptedToolIds: string[],
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.submitToolResult(postId, acceptedToolIds);
        return {};
    } catch (error) {
        logError('[submitToolResult]', error);
        return {error: getFullErrorMessage(error)};
    }
}
