// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';
import type {AIAgent, AIRewriteRequest, AIRewriteResponse} from '@ai/rewrite/types';

export interface ClientAIMix {
    getAIAgents: () => Promise<AIAgent[]>;
    getAIRewrittenMessage: (message: string, action?: string, customPrompt?: string, agentId?: string) => Promise<string>;
}

const ClientAI = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getAIAgents = async (): Promise<AIAgent[]> => {
        return this.doFetch(
            `${this.urlVersion}/agents`,
            {method: 'get'},
        ) as unknown as Promise<AIAgent[]>;
    };

    getAIRewrittenMessage = async (message: string, action?: string, customPrompt?: string, agentId?: string): Promise<string> => {
        const body: AIRewriteRequest = {
            agent_id: agentId,
            message,
            action,
            custom_prompt: customPrompt,
        };

        const response = await this.doFetch(
            `${this.urlVersion}/posts/rewrite`,
            {method: 'post', body},
            true,
        ) as AIRewriteResponse;

        if (response.rewritten_text === undefined) {
            return response as unknown as string;
        }

        return response.rewritten_text;
    };
};

export default ClientAI;

