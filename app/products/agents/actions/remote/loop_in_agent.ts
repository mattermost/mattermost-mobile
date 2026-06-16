// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

/**
 * Loop an agent into the thread of the post that @mentioned it without one.
 * @param serverUrl The server URL
 * @param postId The post to loop the agent into
 * @param botUsername The agent's username
 * @returns {error} on failure
 */
export async function loopInAgent(
    serverUrl: string,
    postId: string,
    botUsername: string,
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.doLoopInAgent(postId, botUsername);
        return {};
    } catch (error) {
        logError('[loopInAgent]', error);
        return {error: getFullErrorMessage(error)};
    }
}
