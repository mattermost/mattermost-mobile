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

    // The requesting user's DM channel with this agent. Used to detect
    // "already talking to the agent" contexts (no @mention prepend needed).
    dmChannelID?: string;
};

/**
 * A saved prompt template from the plugin's custom prompts store
 * (customprompts.CustomPrompt wire shape). Mobile only consumes these;
 * authoring/management stays on the webapp.
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
 * Response from POST /custom-prompts/{id}/render — the template with
 * context variables (channel/user/bot/server) resolved server-side.
 */
export type RenderCustomPromptResponse = {
    rendered: string;
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
