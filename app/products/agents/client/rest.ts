// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ChannelAnalysisOptions = {
    since?: string;
    until?: string;
    days?: number;
    prompt?: string;
    unreads_only?: boolean;
};

type ChannelAnalysisResponse = {
    postid: string;
    channelid: string;
};

export type Agent = {
    id: string;
    displayName: string;
    username: string;
    service_type?: string;
    service_id?: string;
};

type AgentsResponse = {
    agents: Agent[];
};

export interface ClientAgentsMix {
    getAgentsRoute: () => string;
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
}

const ClientAgents = (superclass: any) => class extends superclass {
    getAgentsRoute = () => {
        return '/plugins/mattermost-ai';
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
};

export default ClientAgents;
