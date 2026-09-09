// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import customPromptsStore from '@agents/store/custom_prompts_store';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {CustomPrompt} from '@agents/types/api';

/**
 * Fetch all custom prompts visible to the current user (own + shared) and
 * cache them in the ephemeral store.
 */
export const fetchCustomPrompts = async (serverUrl: string): Promise<{data?: CustomPrompt[]; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const prompts = (await client.getCustomPrompts()) ?? [];
        customPromptsStore.setPrompts(serverUrl, prompts);
        return {data: prompts};
    } catch (error) {
        logError('error on fetchCustomPrompts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

/**
 * Fetch the current user's pinned prompt ids and cache them in the
 * ephemeral store. Pinning is managed on the webapp; mobile only reads.
 */
export const fetchCustomPromptPins = async (serverUrl: string): Promise<{data?: string[]; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const pinnedIds = (await client.getCustomPromptPins()) ?? [];
        customPromptsStore.setPinnedIds(serverUrl, pinnedIds);
        return {data: pinnedIds};
    } catch (error) {
        logError('error on fetchCustomPromptPins', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

/**
 * Render a prompt's template server-side with the given channel/bot context.
 * Not cached — rendering depends on the request context.
 */
export const renderCustomPrompt = async (
    serverUrl: string,
    promptId: string,
    channelId?: string,
    botUsername?: string,
): Promise<{data?: string; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.renderCustomPrompt(promptId, channelId, botUsername);
        return {data: response.rendered};
    } catch (error) {
        logError('error on renderCustomPrompt', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
