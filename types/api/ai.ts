// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type AIRewriteAction = 'shorten' | 'elaborate' | 'improve_writing' | 'fix_spelling' | 'simplify' | 'summarize' | 'custom';

export type AIAgent = {
    id: string;
    displayName: string;
    username: string;
    service_id: string;
    service_type: string;
}

export type AIRewriteRequest = {
    agent_id?: string;
    message: string;
    action?: string;
    custom_prompt?: string;
}

export type AIRewriteResponse = {
    rewritten_text: string;
}

