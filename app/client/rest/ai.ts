// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';
import type {AIRewriteRequest, AIRewriteResponse} from '@typings/api/ai';

export interface ClientAIMix {
    getAIRewrittenMessage: (message: string, action?: string, customPrompt?: string) => Promise<string>;
}

const ClientAI = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getAIRewrittenMessage = async (message: string, action?: string, customPrompt?: string): Promise<string> => {
        const body: AIRewriteRequest = {
            message,
            action,
            custom_prompt: customPrompt,
        };

        const response = await this.doFetch(
            `${this.urlVersion}/ai/rewrite`,
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

