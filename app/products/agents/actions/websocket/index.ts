// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {invalidateConversation} from '@agents/store/conversation_store';
import streamingStore from '@agents/store/streaming_store';

import type {PostUpdateWebsocketMessage} from '@agents/types';

/**
 * Handle agent post update WebSocket events
 * Called when the server sends streaming updates for agent responses
 */
export function handleAgentPostUpdate(serverUrl: string, msg: WebSocketMessage<PostUpdateWebsocketMessage>): void {
    if (!msg.data) {
        return;
    }

    // Delegate to the streaming store, passing serverUrl so per-server eviction
    // on logout works correctly when multiple servers are connected.
    streamingStore.handleWebSocketMessage(msg.data, serverUrl);
}

/**
 * Handle a conversation-level update broadcast from the plugin (plugin >= 2.0).
 * Drops the cached conversation so the next subscriber re-fetches the latest
 * turns. No-op if the event arrives without a conversation_id payload.
 */
export function handleAgentConversationUpdated(
    serverUrl: string,
    msg: WebSocketMessage<{conversation_id?: string}>,
): void {
    const conversationId = msg.data?.conversation_id;
    if (!conversationId) {
        return;
    }
    invalidateConversation(serverUrl, conversationId);
}
