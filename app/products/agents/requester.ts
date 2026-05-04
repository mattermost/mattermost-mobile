// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isPostRequester} from '@agents/utils';

import type {ConversationResponse} from '@agents/types';
import type PostModel from '@typings/database/models/servers/post';

interface Params {
    post: PostModel | Post;
    conversation?: ConversationResponse;
    currentUserId?: string;
}

// Loaded conversation is authoritative; otherwise fall back to the legacy
// llm_requester_user_id prop set by older plugins and meeting-summary posts.
export function isConversationRequester({post, conversation, currentUserId}: Params): boolean {
    if (!currentUserId) {
        return false;
    }
    if (conversation) {
        return conversation.user_id === currentUserId;
    }
    return isPostRequester(post, currentUserId);
}
