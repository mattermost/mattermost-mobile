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

/**
 * Type definition for WebSocket messages
 */
interface WebSocketMessage<T = any> {
    event: string;
    data: T;
    broadcast: {
        omit_users: Record<string, boolean> | null;
        user_id: string;
        channel_id: string;
        team_id: string;
    };
    seq: number;
}
