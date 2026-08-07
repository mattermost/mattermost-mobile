// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
import {CONTROL_SIGNALS} from '@agents/constants';
import conversationStore from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {PostUpdateWebsocketMessage} from '@agents/types';

/**
 * Handle agent post update WebSocket events
 * Called when the server sends streaming updates for agent responses
 */
export function handleAgentPostUpdate(serverUrl: string, msg: WebSocketMessage<PostUpdateWebsocketMessage>): void {
    if (!msg.data) {
        return;
    }

    // Delegate to the streaming store
    streamingStore.handleWebSocketMessage(serverUrl, msg.data);

    // A settling stream (`end`/`cancel`) is the moment the server has
    // finalised the response turns, so refresh the cached conversation here
    // rather than only from the mounted post component. The component's
    // generating->false refetch can miss the transition entirely when a short
    // stream's start/end events coalesce into a single render (seen with
    // regenerations that pause immediately for tool approval), and it never
    // fires when the post isn't mounted — leaving a stale cache for re-entry.
    // Webapp parity: llmbot_post invalidates the conversation on `end`.
    const {control, post_id} = msg.data;
    if (post_id && (control === CONTROL_SIGNALS.END || control === CONTROL_SIGNALS.CANCEL)) {
        refetchConversationForPost(serverUrl, post_id);
    }
}

/**
 * Refetch the cached conversation belonging to a post, resolving the
 * conversation id from the post's props. Skips posts whose conversation was
 * never viewed (nothing cached) — the first view fetches fresh data anyway.
 */
async function refetchConversationForPost(serverUrl: string, postId: string): Promise<void> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const post = await getPostById(database, postId);
        const conversationId = (post?.props as Record<string, unknown> | undefined)?.conversation_id;
        if (typeof conversationId !== 'string' || conversationId === '') {
            logDebug('[refetchConversationForPost] no conversation_id on post', {postId});
            return;
        }
        const cached = conversationStore.getState(serverUrl, conversationId);
        if (!cached.conversation && !cached.loading && !cached.error) {
            return;
        }
        refetchConversation(serverUrl, conversationId);
    } catch (error) {
        logDebug('error on refetchConversationForPost', getFullErrorMessage(error));
    }
}

/**
 * Handle a conversation-level update broadcast from the plugin (plugin >= 2.0).
 * Forces a re-fetch so subscribers see the latest turns. No-op if the event
 * arrives without a conversation_id payload.
 */
export function handleAgentConversationUpdated(
    serverUrl: string,
    msg: WebSocketMessage<{conversation_id?: string}>,
): void {
    const conversationId = msg.data?.conversation_id;
    if (!conversationId) {
        return;
    }
    refetchConversation(serverUrl, conversationId);
}
