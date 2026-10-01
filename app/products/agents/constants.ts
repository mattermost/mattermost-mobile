// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Agent post types
 */
export const AGENT_POST_TYPES = {
    LLMBOT: 'custom_llmbot',
    LLM_POSTBACK: 'custom_llm_postback',
    AGENT_MENTION_REMINDER: 'custom_agent_mention_reminder',
} as const;

/**
 * Minimum touch target size for accessibility (44pt per iOS HIG)
 */
export const TOUCH_TARGET_SIZE = 44;

/**
 * WebSocket event name for agent post updates
 */
export const AGENT_WEBSOCKET_EVENT = 'custom_mattermost-ai_postupdate';

/**
 * WebSocket event name for tool call status updates in channels
 */
export const AGENT_TOOL_CALL_STATUS_EVENT = 'custom_mattermost-ai_tool_call_status_updated';

/**
 * Control signal values from WebSocket messages
 */
export const CONTROL_SIGNALS = {
    START: 'start',
    END: 'end',
    CANCEL: 'cancel',
    CONTINUE: 'continue',
    REASONING_SUMMARY: 'reasoning_summary',
    REASONING_SUMMARY_DONE: 'reasoning_summary_done',
    TOOL_CALL: 'tool_call',
    ANNOTATIONS: 'annotations',
    SERVER_TOOL: 'server_tool',
    PROGRESS: 'progress',
} as const;

/**
 * Phases the plugin reports before a response starts streaming, in order
 * (conversations/progress.go). Each event carries its 1-based position as
 * progress_seq.
 */
export const PROGRESS_PHASES = ['checking_mcp', 'loading_conversation', 'preparing_request', 'connecting_provider'] as const;
export type ProgressPhase = typeof PROGRESS_PHASES[number];

export const DEFAULT_AGENT_BOT_USERNAME = 'ai-bot';
export const AGENT_ANALYSIS_SUMMARY = 'summarize_channel';

/**
 * The analysis_type values accepted by the plugin's thread analysis endpoint
 * (api/api_post.go handleThreadAnalysis).
 */
export const THREAD_ANALYSIS_TYPES = {
    SUMMARIZE_THREAD: 'summarize_thread',
    ACTION_ITEMS: 'action_items',
    OPEN_QUESTIONS: 'open_questions',
} as const;

/**
 * The preset_prompt values accepted by the plugin's channel interval endpoint
 * (api/api_channel.go handleInterval); anything else is rejected with a 400.
 * A fourth preset, summarize_range, exists but is not used by the unreads
 * summarization feature.
 */
export const CHANNEL_INTERVAL_PRESETS = {
    SUMMARIZE_UNREADS: 'summarize_unreads',
    ACTION_ITEMS: 'action_items',
    OPEN_QUESTIONS: 'open_questions',
} as const;
