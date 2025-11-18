// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Agent post types
 */
export const AGENT_POST_TYPES = {
    LLMBOT: 'custom_llmbot',
    LLM_POSTBACK: 'custom_llm_postback',
} as const;

/**
 * WebSocket event name for agent post updates
 */
export const AGENT_WEBSOCKET_EVENT = 'custom_mattermost-ai_postupdate';

/**
 * Control signal values from WebSocket messages
 */
export const CONTROL_SIGNALS = {
    START: 'start',
    END: 'end',
    CANCEL: 'cancel',
    REASONING_SUMMARY: 'reasoning_summary',
    TOOL_CALL: 'tool_call',
    ANNOTATIONS: 'annotations',
} as const;
