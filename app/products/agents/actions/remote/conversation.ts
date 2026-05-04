// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {ConversationResponse} from '@agents/types';

// The server applies per-user privacy filtering on the response, so callers
// don't need a separate private fetch.
export async function fetchConversation(
    serverUrl: string,
    conversationId: string,
): Promise<{data?: ConversationResponse; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.getConversation(conversationId);
        return {data};
    } catch (error) {
        logError('[fetchConversation] Failed to fetch conversation', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error: getFullErrorMessage(error)};
    }
}
