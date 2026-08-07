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

    // Identifies the MCP server the tool came from (omitempty on the server;
    // present only for MCP tools).
    server_origin?: string;

    // Bare tool name without the MCP server namespace prefix; preferred for
    // display when present. Redacted (empty) for non-requesters.
    mcp_bare_name?: string;

    // Non-empty for tools answered by the user instead of executed by the
    // server (e.g. AskUserQuestion).
    user_interaction?: string;

    // True for a pending call that passed the auto-execution policy. The call
    // may be running live or paused in a persisted round, but never needs an
    // individual approval decision.
    would_auto_execute?: boolean;

    // True when the matching tool result has already received its terminal
    // share/keep-private decision (decided_at set server-side). Derived from
    // the conversation API; absent on live websocket payloads.
    decided?: boolean;
}

/**
 * Citation/annotation data structure. `url`/`title` are optional because
 * web-search annotations persisted by the plugin may omit them.
 */
export interface Annotation {
    type: string;
    start_index: number;
    end_index: number;
    url?: string;
    title?: string;
    cited_text?: string;
    index: number;
}

/**
 * Reasoning summary extracted from an assistant turn's thinking blocks.
 */
export interface Reasoning {
    summary: string;
    signature: string;
}

/**
 * One assistant turn in a response. A multi-step answer renders these as a
 * vertical sequence: text -> tools -> text -> tools -> final text.
 */
export interface Round {
    id: string;
    text: string;
    toolCalls: ToolCall[];
    reasoning: Reasoning;
    annotations: Annotation[];
}

/**
 * WebSocket message data for agent post updates
 */
export interface PostUpdateWebsocketMessage {
    post_id: string;
    next?: string; // Full accumulated message text
    control?: string; // Control signals: 'start', 'end', 'cancel', 'continue', 'reasoning_summary', 'reasoning_summary_done', 'tool_call', 'annotations'
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
    toolCalls: ToolCall[]; // Tool calls pending approval or processed (current round)
    annotations: Annotation[]; // Citations/annotations for the post (current round)
    rounds: Round[]; // Completed rounds snapshotted as each tool round resolves
    stopped: boolean; // True after the user taps Stop; suppresses late `next` events
    continueSeq: number; // Bumped on a tool-approval `continue` resume to trigger a refetch
}

// Normalised mobile shape: `id` is always the root post id (see fetchAIThreads).
export interface AIThread {
    id: string;
    message: string;
    title: string;
    channel_id: string;
    reply_count: number;
    turn_count: number;
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
    turn_count?: number;
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

    // System-wide default bot flag. Sent as camelCase `isDefault` with
    // omitempty by the plugin, so it is absent when false.
    isDefault?: boolean;
}

/**
 * Minimal serialisable agent identity used by agent selector flows. AiBot
 * records satisfy this shape structurally; map to plain objects when agent
 * data must cross navigation params.
 */
export type SelectableAgent = {
    id: string;
    displayName: string;
    username: string;
};

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

export type RewriteAction = 'shorten' | 'elaborate' | 'improve_writing' | 'fix_spelling' | 'simplify' | 'summarize' | 'custom';
