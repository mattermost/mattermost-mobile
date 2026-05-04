// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AIBotsResponse, ConversationResponse, RawAIThread, ToolCall} from '@agents/types';
import type {Agent, AgentsResponse, AgentsStatusResponse, ChannelAnalysisOptions, ChannelAnalysisResponse, RewriteRequest, RewriteResponse} from '@agents/types/api';

export type {Agent};

export interface ClientAgentsMix {
    getAgentsRoute: () => string;
    getAIBots: () => Promise<AIBotsResponse>;
    getAIThreads: () => Promise<RawAIThread[] | null>;
    getAgents: () => Promise<Agent[]>;
    stopGeneration: (postId: string) => Promise<void>;
    regenerateResponse: (postId: string) => Promise<void>;
    doChannelAnalysis: (
        channelId: string,
        analysisType: string,
        botUsername: string,
        options?: ChannelAnalysisOptions,
    ) => Promise<ChannelAnalysisResponse>;
    submitToolApproval: (postId: string, acceptedToolIds: string[]) => Promise<void>;

    // Legacy endpoints (plugin < 2.0): redaction fetched via dedicated routes.
    // New plugin scopes privacy at the conversation-fetch / websocket layer.
    getToolCallPrivate: (postId: string) => Promise<ToolCall[]>;
    getToolResultPrivate: (postId: string) => Promise<ToolCall[]>;
    submitToolResult: (postId: string, acceptedToolIds: string[]) => Promise<void>;

    // Conversation entity (plugin >= 2.0): source of truth for tool calls,
    // reasoning, and annotations after a stream finalizes.
    getConversation: (conversationId: string) => Promise<ConversationResponse>;

    // Rewrite methods
    getRewrittenMessage: (message: string, action?: string, customPrompt?: string, agentId?: string) => Promise<string>;
    getAgentsStatus: () => Promise<AgentsStatusResponse>;
}

const ClientAgents = (superclass: any) => class extends superclass {
    getAgentsRoute = () => {
        return '/plugins/mattermost-ai';
    };

    getAIBots = async () => {
        return this.doFetch(
            `${this.getAgentsRoute()}/ai_bots`,
            {method: 'get'},
        );
    };

    getAIThreads = async () => {
        return this.doFetch(
            `${this.getAgentsRoute()}/ai_threads`,
            {method: 'get'},
        );
    };

    getAgents = async (): Promise<Agent[]> => {
        const response = await this.doFetch(
            `${this.urlVersion}/agents`,
            {method: 'get'},
        );

        // Handle both array response and wrapped response
        if (Array.isArray(response)) {
            return response;
        }
        return (response as AgentsResponse).agents || [];
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

    doChannelAnalysis = async (
        channelId: string,
        analysisType: string,
        botUsername: string,
        options?: ChannelAnalysisOptions,
    ): Promise<ChannelAnalysisResponse> => {
        const {since, until, days, prompt, unreads_only} = options || {};
        return this.doFetch(
            `${this.getAgentsRoute()}/channel/${channelId}/analyze?botUsername=${encodeURIComponent(botUsername)}`,
            {
                method: 'post',
                body: {
                    analysis_type: analysisType,
                    since,
                    until,
                    days,
                    prompt,
                    unreads_only,
                },
            },
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

    getToolCallPrivate = async (postId: string): Promise<ToolCall[]> => {
        return this.doFetch(
            `${this.getAgentsRoute()}/post/${postId}/tool_call_private`,
            {method: 'get'},
        );
    };

    getToolResultPrivate = async (postId: string): Promise<ToolCall[]> => {
        return this.doFetch(
            `${this.getAgentsRoute()}/post/${postId}/tool_result_private`,
            {method: 'get'},
        );
    };

    submitToolResult = async (postId: string, acceptedToolIds: string[]) => {
        return this.doFetch(
            `${this.getAgentsRoute()}/post/${postId}/tool_result`,
            {
                method: 'post',
                body: {accepted_tool_ids: acceptedToolIds},
            },
        );
    };

    getConversation = async (conversationId: string): Promise<ConversationResponse> => {
        return this.doFetch(
            `${this.getAgentsRoute()}/conversations/${conversationId}`,
            {method: 'get'},
        );
    };

    // =========================================================================
    // Rewrite Methods
    // =========================================================================

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

    getAgentsStatus = async (): Promise<AgentsStatusResponse> => {
        return this.doFetch(
            `${this.urlVersion}/agents/status`,
            {method: 'get'},
        );
    };
};

export default ClientAgents;
