// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

/**
 * Stop the current generation for a post
 * @param serverUrl The server URL
 * @param postId The post ID to stop generation for
 * @returns {error} on failure
 */
export async function stopGeneration(
    serverUrl: string,
    postId: string,
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.stopGeneration(postId);
        return {};
    } catch (error) {
        logError('[stopGeneration]', error);
        return {error: getFullErrorMessage(error)};
    }
}

/**
 * Regenerate a response for a post
 * @param serverUrl The server URL
 * @param postId The post ID to regenerate response for
 * @returns {error} on failure
 */
export async function regenerateResponse(
    serverUrl: string,
    postId: string,
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.regenerateResponse(postId);
        return {};
    } catch (error) {
        logError('[regenerateResponse]', error);
        return {error: getFullErrorMessage(error)};
    }
}
