// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Tool call status values
 */
export const ToolCallStatus = {
    Pending: 0,
    Accepted: 1,
    Rejected: 2,
    Error: 3,
    Success: 4,
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type ToolCallStatus = typeof ToolCallStatus[keyof typeof ToolCallStatus];

/**
 * Tool call data structure
 */
export interface ToolCall {
    id: string;
    name: string;
    description: string;
    arguments: any;
    result?: string;
    status: ToolCallStatus;
}

/**
 * Citation/annotation data structure
 */
export interface Annotation {
    type: string;
    start_index: number;
    end_index: number;
    url: string;
    title: string;
    cited_text?: string;
    index: number;
}

/**
 * WebSocket message data for agent post updates
 */
export interface PostUpdateWebsocketMessage {
    post_id: string;
    next?: string; // Full accumulated message text
    control?: string; // Control signals: 'start', 'end', 'cancel', 'reasoning_summary', 'tool_call', 'annotations'
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
    reasoning: string; // Accumulated reasoning text
    isReasoningLoading: boolean; // True while reasoning is being generated
    showReasoning: boolean; // True if reasoning should be displayed
    toolCalls: ToolCall[]; // Tool calls pending approval or processed
    annotations: Annotation[]; // Citations/annotations for the post
}

