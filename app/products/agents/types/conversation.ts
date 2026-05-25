// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Must stay in sync with mattermost-plugin-agents/conversation/content_block.go.
export const BlockType = {
    Text: 'text',
    Thinking: 'thinking',
    ToolUse: 'tool_use',
    ToolResult: 'tool_result',
    File: 'file',
    Image: 'image',
    Annotations: 'annotations',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type BlockType = typeof BlockType[keyof typeof BlockType];

export const ToolCallStatusString = {
    Pending: 'pending',
    Accepted: 'accepted',
    Rejected: 'rejected',
    Error: 'error',
    Success: 'success',
    AutoApproved: 'auto_approved',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ToolCallStatusString = typeof ToolCallStatusString[keyof typeof ToolCallStatusString];

export interface Citation {
    type: string;
    url?: string;
    title?: string;
    start_index: number;
    end_index: number;
}

export interface WebSearchContext {
    results: unknown;
    executed_queries: unknown;
    count: number;
}

// Flat content block; `type` discriminates which optional fields are set.
export interface ContentBlock {
    type: BlockType;

    text?: string;
    signature?: string;
    citations?: Citation[];

    id?: string;
    name?: string;
    server_origin?: string;
    input?: Record<string, unknown> | null;
    status?: ToolCallStatusString;
    shared?: boolean;

    tool_use_id?: string;
    content?: string;

    // Set when the share/keep-private decision has been recorded; absent means pending.
    decided_at?: number;

    filename?: string;
    mime_type?: string;
    file_id?: string;

    web_search_context?: WebSearchContext;
}

export type TurnRole = 'user' | 'assistant' | 'tool_result';

export interface Turn {
    id: string;
    conversation_id?: string;
    post_id: string | null;
    role: TurnRole;
    content: ContentBlock[];
    tokens_in: number;
    tokens_out: number;
    sequence: number;
    created_at?: number;

    // Server-computed; only set on post-anchor assistant turns.
    approval_state?: 'call' | 'result' | 'done';
}

export interface ConversationResponse {
    id: string;
    user_id: string;
    bot_id: string;
    channel_id: string | null;
    root_post_id: string | null;
    title: string;
    operation: string;
    turns: Turn[];
}
