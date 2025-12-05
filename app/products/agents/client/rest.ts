// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface ClientAgentsMix {
    getAgentsRoute: () => string;
    stopGeneration: (postId: string) => Promise<void>;
    regenerateResponse: (postId: string) => Promise<void>;
    submitToolApproval: (postId: string, acceptedToolIds: string[]) => Promise<void>;
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
};

export default ClientAgents;
