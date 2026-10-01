// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createPost} from '@actions/remote/post';
import {setCustomPromptsState, type CustomPromptsState} from '@agents/store/custom_prompts_store';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUserId} from '@queries/servers/system';
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
        const [promptsResult, pinsResult] = await Promise.allSettled([
            client.getCustomPrompts(),
            client.getCustomPromptPins(),
        ]);
        if (promptsResult.status === 'rejected') {
            throw promptsResult.reason;
        }

        // Without pins the prompts are still usable; keep the previous pins.
        const state: Partial<CustomPromptsState> = {prompts: promptsResult.value ?? []};
        if (pinsResult.status === 'fulfilled') {
            state.pinnedPromptIds = pinsResult.value ?? [];
        } else {
            logDebug('error on fetchCustomPrompts pins', getFullErrorMessage(pinsResult.reason));
        }
        setCustomPromptsState(serverUrl, state);

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

/**
 * Render a custom prompt and post the result into `channelId` as the current
 * user. Returns the created post id.
 */
export async function postCustomPrompt(
    serverUrl: string,
    promptId: string,
    channelId: string,
    botUsername?: string,
): Promise<{postId?: string; error?: unknown}> {
    // bot_username lets the server resolve {{.BotName}} for the selected agent.
    const {data: message, error: renderError} = await renderCustomPrompt(serverUrl, promptId, {
        channel_id: channelId,
        bot_username: botUsername,
    });
    if (renderError || message === undefined) {
        return {error: renderError ?? 'empty render'};
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUserId = await getCurrentUserId(database);

        // createPost keeps a failed send locally (retryable) and returns no
        // post, so a missing post is the failure signal.
        const {post, error} = await createPost(serverUrl, {channel_id: channelId, message, user_id: currentUserId});
        if (error || !post?.id) {
            return {error: error ?? 'post not created'};
        }
        return {postId: post.id};
    } catch (error) {
        logDebug('error on postCustomPrompt', getFullErrorMessage(error));
        return {error};
    }
}
