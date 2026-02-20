// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {ToolCall} from '@agents/types';

/**
 * Fetch private tool call data for a post
 * @param serverUrl The server URL
 * @param postId The post ID containing the tool calls
 * @returns {data} on success, {error} on failure
 */
export async function fetchToolCallPrivate(
    serverUrl: string,
    postId: string,
): Promise<{data?: ToolCall[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.getToolCallPrivate(postId);
        return {data};
    } catch (error) {
        logError('[fetchToolCallPrivate]', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error: getFullErrorMessage(error)};
    }
}

/**
 * Fetch private tool result data for a post
 * @param serverUrl The server URL
 * @param postId The post ID containing the tool results
 * @returns {data} on success, {error} on failure
 */
export async function fetchToolResultPrivate(
    serverUrl: string,
    postId: string,
): Promise<{data?: ToolCall[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.getToolResultPrivate(postId);
        return {data};
    } catch (error) {
        logError('[fetchToolResultPrivate]', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error: getFullErrorMessage(error)};
    }
}
