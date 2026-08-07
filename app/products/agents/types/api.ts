// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Options for channel analysis requests. Mirrors the plugin's request struct
 * (api/api_channel.go): analysis_type/since/until/days/prompt/team_id.
 * `team_id` sets the LLM context team for DM/GM channels.
 */
export type ChannelAnalysisOptions = {
    since?: string;
    until?: string;
    days?: number;
    prompt?: string;
    team_id?: string;
};

/**
 * Response from channel analysis API
 */
export type ChannelAnalysisResponse = {
    postid: string;
    channelid: string;
};

/**
 * Response from thread analysis API (api/api_post.go handleThreadAnalysis):
 * the post/channel of the bot DM the analysis streams into.
 */
export type ThreadAnalysisResponse = {
    postid: string;
    channelid: string;
};

/**
 * Response from agents status API
 */
export type AgentsStatusResponse = {
    available: boolean;
    reason?: string;
};

/**
 * A user-created prompt template. Mirrors the plugin's CustomPrompt struct
 * (customprompts/store.go): the server only returns prompts visible to the
 * requesting user (own prompts plus shared ones, never soft-deleted).
 */
export type CustomPrompt = {
    id: string;
    creator_id: string;
    name: string;
    description: string;
    template: string;
    is_shared: boolean;
    created_at: number;
    updated_at: number;
    deleted_at: number;
};

/**
 * Context for a server-side custom prompt render (api/api_custom_prompts.go
 * RenderRequest). Both fields are optional on the server: channel_id scopes
 * {{.Channel}}/{{.Team}} variables, bot_username resolves {{.BotName}}.
 */
export type CustomPromptRenderRequest = {
    channel_id?: string;
    bot_username?: string;
};

/**
 * Response from the custom prompt render endpoint
 */
export type CustomPromptRenderResponse = {
    rendered: string;
};

/**
 * Request payload for rewriting a message
 */
export type RewriteRequest = {
    agent_id?: string;
    message: string;
    action?: string;
    custom_prompt?: string;
};

/**
 * Response from a rewrite request
 */
export type RewriteResponse = {
    rewritten_text: string;
};
