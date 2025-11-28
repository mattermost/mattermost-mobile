// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import streamingStore from '@agents/store/streaming_store';

import type {PostUpdateWebsocketMessage} from '@agents/types';

/**
 * Handle agent post update WebSocket events
 * Called when the server sends streaming updates for agent responses
 */
export function handleAgentPostUpdate(msg: WebSocketMessage<PostUpdateWebsocketMessage>): void {
    if (!msg.data) {
        return;
    }

    // Delegate to the streaming store
    streamingStore.handleWebSocketMessage(msg.data);
}
