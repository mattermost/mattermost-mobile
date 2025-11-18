// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENT_POST_TYPES} from '@agents/constants';

import type PostModel from '@typings/database/models/servers/post';

/**
 * Check if a post is an agent post
 */
export function isAgentPost(post: PostModel | Post): boolean {
    return post.type === AGENT_POST_TYPES.LLMBOT ||
           post.type === AGENT_POST_TYPES.LLM_POSTBACK;
}
