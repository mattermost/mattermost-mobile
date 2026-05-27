// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchConversation} from '@agents/actions/remote/conversation';
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

    // Delegate to the streaming store
    streamingStore.handleWebSocketMessage(serverUrl, msg.data);
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
