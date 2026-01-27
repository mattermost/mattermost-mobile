// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {rewriteStore} from '@agents/store';

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type {RewriteAction} from '@agents/types';

/**
 * Fetch available agents from the server and store them in the rewrite store
 */
export const fetchAgents = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const agents = await client.getAgents();

        // Store agents in rewriteStore
        rewriteStore.setAgents(serverUrl, agents);

        return {agents};
    } catch (error) {
        logDebug('[fetchAgents] Error:', getFullErrorMessage(error));
        return {error};
    }
};

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
