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
 * Agent data structure
 */
export type Agent = {
    id: string;
    displayName: string;
    username: string;
    service_type?: string;
    service_id?: string;
};

/**
 * Response from agents list API
 */
export type AgentsResponse = {
    agents: Agent[];
};

/**
 * Response from agents status API
 */
export type AgentsStatusResponse = {
    available: boolean;
    reason?: string;
};
