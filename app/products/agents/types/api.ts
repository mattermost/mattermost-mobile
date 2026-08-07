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
 * Response from agents status API
 */
export type AgentsStatusResponse = {
    available: boolean;
    reason?: string;
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
