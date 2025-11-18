// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientAgentsMix {
    stopAgentGeneration: (postId: string) => Promise<{status: 'ok'}>;
    regenerateAgentPost: (postId: string) => Promise<{status: 'ok'}>;
    approveToolCalls: (postId: string, toolIds: string[]) => Promise<{status: 'ok'}>;
    rejectToolCalls: (postId: string, toolIds: string[]) => Promise<{status: 'ok'}>;
}

const ClientAgents = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    /**
     * Stop an active agent generation
     * @param postId - The ID of the post being generated
     */
    stopAgentGeneration = async (postId: string) => {
        return this.doFetch(
            `${this.getPluginsRoute()}/mattermost-ai/post/${postId}/stop`,
            {method: 'post'},
        );
    };

    /**
     * Regenerate an agent post response
     * @param postId - The ID of the post to regenerate
     */
    regenerateAgentPost = async (postId: string) => {
        return this.doFetch(
            `${this.getPluginsRoute()}/mattermost-ai/post/${postId}/regenerate`,
            {method: 'post'},
        );
    };

    /**
     * Approve pending tool calls for an agent post
     * @param postId - The ID of the post with pending tool calls
     * @param toolIds - Array of tool call IDs to approve
     */
    approveToolCalls = async (postId: string, toolIds: string[]) => {
        return this.doFetch(
            `${this.getPluginsRoute()}/mattermost-ai/post/${postId}/tool_call`,
            {
                method: 'post',
                body: JSON.stringify({
                    accepted_tool_ids: toolIds,
                }),
            },
        );
    };

    /**
     * Reject pending tool calls for an agent post
     * @param postId - The ID of the post with pending tool calls
     * @param toolIds - Array of tool call IDs to reject
     */
    rejectToolCalls = async (postId: string, toolIds: string[]) => {
        return this.doFetch(
            `${this.getPluginsRoute()}/mattermost-ai/post/${postId}/tool_call`,
            {
                method: 'post',
                body: JSON.stringify({
                    rejected_tool_ids: toolIds,
                }),
            },
        );
    };
};

export default ClientAgents;
