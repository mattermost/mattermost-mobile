// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Agent, RewriteRequest, RewriteResponse} from '@agents/types';

export interface ClientAgentsMix {
    getAgentsRoute: () => string;
    stopGeneration: (postId: string) => Promise<void>;
    regenerateResponse: (postId: string) => Promise<void>;
    submitToolApproval: (postId: string, acceptedToolIds: string[]) => Promise<void>;

    // Rewrite methods
    getAgents: () => Promise<Agent[]>;
    getRewrittenMessage: (message: string, action?: string, customPrompt?: string, agentId?: string) => Promise<string>;
}

const ClientAgents = (superclass: any) => class extends superclass {
    getAgentsRoute = () => {
        return '/plugins/mattermost-ai';
    };

    stopGeneration = async (postId: string) => {
        return this.doFetch(
            `${this.getAgentsRoute()}/post/${postId}/stop`,
            {method: 'post'},
        );
    };

    regenerateResponse = async (postId: string) => {
        return this.doFetch(
            `${this.getAgentsRoute()}/post/${postId}/regenerate`,
            {method: 'post'},
        );
    };

    submitToolApproval = async (postId: string, acceptedToolIds: string[]) => {
        return this.doFetch(
            `${this.getAgentsRoute()}/post/${postId}/tool_call`,
            {
                method: 'post',
                body: {accepted_tool_ids: acceptedToolIds},
            },
        );
    };

    // =========================================================================
    // Rewrite Methods
    // =========================================================================

    getAgents = async (): Promise<Agent[]> => {
        return this.doFetch(
            `${this.urlVersion}/agents`,
            {method: 'get'},
        ) as unknown as Promise<Agent[]>;
    };

    getRewrittenMessage = async (message: string, action?: string, customPrompt?: string, agentId?: string): Promise<string> => {
        const body: RewriteRequest = {
            agent_id: agentId,
            message,
            action,
            custom_prompt: customPrompt,
        };

        const response = await this.doFetch(
            `${this.urlVersion}/posts/rewrite`,
            {method: 'post', body},
            true,
        ) as RewriteResponse;

        // Handle cases where the AI returns plain text instead of the expected JSON format.
        // If rewritten_text is undefined, treat the entire response as the rewritten message.
        if (response.rewritten_text === undefined) {
            return response as unknown as string;
        }

        return response.rewritten_text;
    };
};

export default ClientAgents;
