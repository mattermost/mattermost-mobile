// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {RewriteAction} from '@agents/types';

/**
 * Rewrite a message using the AI service
 * @param serverUrl The server URL
 * @param message The message to rewrite
 * @param action The rewrite action to perform
 * @param customPrompt Optional custom prompt for the rewrite
 * @param agentId Optional agent ID to use for the rewrite
 * @returns {rewrittenText} on success, {error} on failure
 */
export async function rewriteMessage(
    serverUrl: string,
    message: string,
    action: RewriteAction,
    customPrompt: string | undefined,
    agentId: string | undefined,
): Promise<{rewrittenText?: string; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const rewrittenText = await client.getRewrittenMessage(message, action, customPrompt, agentId);
        return {rewrittenText};
    } catch (error) {
        logError('[rewriteMessage]', error);
        return {error: getFullErrorMessage(error)};
    }
}
