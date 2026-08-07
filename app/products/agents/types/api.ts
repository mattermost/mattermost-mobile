// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Options for channel analysis requests
 */
export type ChannelAnalysisOptions = {
    since?: string;
    until?: string;
    days?: number;
    prompt?: string;
    unreads_only?: boolean;
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
