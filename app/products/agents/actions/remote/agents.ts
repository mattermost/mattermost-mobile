// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIBots} from '@agents/actions/remote/bots';
import {rewriteStore} from '@agents/store';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {Agent, RewriteAction} from '@agents/types';

/**
 * Fetch available agents from the plugin's /ai_bots endpoint, persist them to
 * the database (via fetchAIBots) and mirror a lightweight projection into the
 * rewrite store for selector surfaces and the composer gate.
 */
export const fetchAgents = async (serverUrl: string): Promise<{data?: Agent[]; error?: unknown}> => {
    const {bots, error} = await fetchAIBots(serverUrl);
    if (error) {
        return {error};
    }

    const agents: Agent[] = (bots ?? []).map((bot) => ({
        id: bot.id,
        displayName: bot.displayName,
        username: bot.username,
        isDefault: bot.isDefault,
    }));

    rewriteStore.setAgents(serverUrl, agents);

    return {data: agents};
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
