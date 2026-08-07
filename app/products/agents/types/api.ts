// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Options for channel analysis requests. Mirrors the request struct the
 * plugin binds in handleChannelAnalysis (analysis_type/since/until/days/
 * prompt/team_id — there is no unreads_only server-side).
 */
export type ChannelAnalysisOptions = {
    since?: string;
    until?: string;
    days?: number;
    prompt?: string;

    // Lets the server set the team context for DM/GM channels, which have
    // no team of their own.
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
 * Agent data structure. A lightweight projection of the plugin's
 * `/ai_bots` wire shape (`AIBotInfo`) used by selector surfaces.
 * The bot's MM user id is shared with the bridge `agent_id` accepted by
 * `/api/v4/posts/rewrite`, so this works for rewrite targeting too.
 */
export type Agent = {
    id: string;
    displayName: string;
    username: string;

    // System-wide default agent flag. Omitted by the server when false.
    isDefault?: boolean;

    // Channel scoping (llm.ChannelAccessLevel semantics: 0 all, 1 allow
    // only channelIDs, 2 block channelIDs, 3 none). User-level restrictions
    // are already applied server-side before /ai_bots returns.
    channelAccessLevel?: number;
    channelIDs?: string[];
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
