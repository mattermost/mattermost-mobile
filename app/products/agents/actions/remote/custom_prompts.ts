// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setCustomPromptsState} from '@agents/store/custom_prompts_store';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {CustomPromptRenderRequest, CustomPromptRenderResponse} from '@agents/types/api';

/**
 * Fetch the prompts visible to the user plus their pinned prompt ids and
 * populate the ephemeral store. Called when a consuming surface mounts (the
 * agent new-chat screen or the composer prompt list), not on app start.
 */
export async function fetchCustomPrompts(serverUrl: string): Promise<{data?: boolean; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const [prompts, pinnedPromptIds] = await Promise.all([
            client.getCustomPrompts(),
            client.getCustomPromptPins(),
        ]);

        setCustomPromptsState(serverUrl, {
            prompts: prompts ?? [],
            pinnedPromptIds: pinnedPromptIds ?? [],
        });

        return {data: true};
    } catch (error) {
        logDebug('error on fetchCustomPrompts', getFullErrorMessage(error));
        return {error};
    }
}

/**
 * Render a custom prompt template server-side with the given context. The
 * server whitelists the template variables; mobile never runs the template
 * engine itself.
 */
export async function renderCustomPrompt(
    serverUrl: string,
    promptId: string,
    context: CustomPromptRenderRequest,
): Promise<{data?: string; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response: CustomPromptRenderResponse = await client.renderCustomPrompt(promptId, context);
        return {data: response.rendered};
    } catch (error) {
        logDebug('error on renderCustomPrompt', getFullErrorMessage(error));
        return {error};
    }
}
