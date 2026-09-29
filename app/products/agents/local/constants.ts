// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const LOCAL_AGENT_ID = 'local-gemma';
export const LOCAL_AGENT_DISPLAY_NAME = 'Gemma';
export const LOCAL_AGENT_MODEL_FILENAME = 'gemma-4-E2B-it.litertlm';
export const LOCAL_AGENT_MODEL_BUNDLE_SUBPATH = `LocalModels/${LOCAL_AGENT_MODEL_FILENAME}`;

// iOS has no LiteRT NPU path; GPU (Metal) is the accelerated backend. A failed GPU load falls back to CPU (XNNPack).
export const LOCAL_AGENT_BACKEND: 'cpu' | 'gpu' = 'gpu';

// The KV cache is allocated up front for the full context, so this is the main runtime memory lever.
export const LOCAL_AGENT_MAX_CONTEXT_TOKENS = 8192;
export const LOCAL_AGENT_MAX_OUTPUT_TOKENS = 1024;
export const LOCAL_AGENT_MAX_TOOL_STEPS = 4;
export const LOCAL_AGENT_READ_CHANNEL_TOKEN_BUDGET = 4000;
export const LOCAL_AGENT_HISTORY_MAX_TURNS = 6;
export const LOCAL_AGENT_HISTORY_MAX_CHARS_PER_TURN = 600;
export const LOCAL_AGENT_CHARS_PER_TOKEN = 4;
export const LOCAL_AGENT_FIND_CHANNEL_LIMIT = 10;
export const LOCAL_AGENT_POST_TRUNCATE_CHARS = 400;

export const LocalAgentMessageStatus = {
    Complete: 'complete',
    Streaming: 'streaming',
    Error: 'error',
    Cancelled: 'cancelled',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type LocalAgentMessageStatus = typeof LocalAgentMessageStatus[keyof typeof LocalAgentMessageStatus];

export const LocalAgentMessageRole = {
    User: 'user',
    Assistant: 'assistant',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type LocalAgentMessageRole = typeof LocalAgentMessageRole[keyof typeof LocalAgentMessageRole];
