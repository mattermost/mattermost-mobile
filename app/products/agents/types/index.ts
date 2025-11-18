// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * WebSocket message data for agent post updates
 */
export interface PostUpdateWebsocketMessage {
    post_id: string;
    next?: string;      // Full accumulated message text
    control?: string;   // Control signals: 'start', 'end', 'cancel', 'reasoning_summary', 'tool_call', 'annotations'
    tool_call?: string; // JSON-encoded tool calls
    reasoning?: string; // Reasoning summary text
    annotations?: string; // JSON-encoded citations
}

/**
 * Streaming state for an active agent post
 */
export interface StreamingState {
    postId: string;
    generating: boolean;
    message: string;
    precontent: boolean; // True during 'start' before first content
}

/**
 * Events emitted by the streaming store
 */
export enum StreamingEvents {
    STARTED = 'agents_streaming_started',
    UPDATED = 'agents_streaming_updated',
    ENDED = 'agents_streaming_ended',
}
