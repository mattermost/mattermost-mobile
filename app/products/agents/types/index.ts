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
    AutoApproved: 5,
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type ToolCallStatus = typeof ToolCallStatus[keyof typeof ToolCallStatus];

/**
 * Tool approval stage values. Mirrors the server-computed approval state for
 * a post. 'done' means no user decision remains (auto-run, keep private, all
 * rejected, or no tool_use blocks at all) — render no buttons.
 */
export const ToolApprovalStage = {
    Call: 'call',
    Result: 'result',
    Done: 'done',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type ToolApprovalStage = typeof ToolApprovalStage[keyof typeof ToolApprovalStage];

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

// Normalised mobile shape: `id` is always the root post id (see fetchAIThreads).
export interface AIThread {
    id: string;
    message: string;
    title: string;
    channel_id: string;
    reply_count: number;
    update_at: number;

    // Raw plugin >= 2.0 fields, surfaced for callers that need them.
    root_post_id?: string | null;
    bot_id?: string;
}

// Wire-format AI thread before normalisation. plugin < 2.0 omits root_post_id.
export type RawAIThread = {
    id: string;
    message?: string;
    title?: string;
    channel_id?: string | null;
    reply_count?: number;
    update_at?: number;
    root_post_id?: string | null;
    bot_id?: string;
};

/**
 * Channel access level values
 */
export const ChannelAccessLevel = {
    All: 0,
    Allow: 1,
    Block: 2,
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type ChannelAccessLevel = typeof ChannelAccessLevel[keyof typeof ChannelAccessLevel];

/**
 * User access level values
 */
export const UserAccessLevel = {
    All: 0,
    Allow: 1,
    Block: 2,
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type UserAccessLevel = typeof UserAccessLevel[keyof typeof UserAccessLevel];

/**
 * LLM Bot data structure
 */
export interface LLMBot {
    id: string;
    displayName: string;
    username: string;
    lastIconUpdate: number;
    dmChannelID: string;
    channelAccessLevel: ChannelAccessLevel;
    channelIDs: string[];
    userAccessLevel: UserAccessLevel;
    userIDs: string[];
    teamIDs: string[];

    // System-wide default bot flag. Absent on older servers.
    is_default?: boolean;
}

/**
 * AI Bots response from the server
 */
export interface AIBotsResponse {
    bots: LLMBot[];
    searchEnabled: boolean;
    allowUnsafeLinks: boolean;
}

export {
    BlockType,
    ToolCallStatusString,
    type Citation,
    type ContentBlock,
    type ConversationResponse,
    type Turn,
    type TurnRole,
    type WebSearchContext,
} from './conversation';

export type {Agent} from './api';

export type RewriteAction = 'shorten' | 'elaborate' | 'improve_writing' | 'fix_spelling' | 'simplify' | 'summarize' | 'custom';
