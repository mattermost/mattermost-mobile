// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import AgentPostLegacy from './agent_post_legacy';
import AgentPostNew from './agent_post_new';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

export interface AgentPostProps {
    post: PostModel;
    currentUserId?: string;
    location: AvailableScreens;
    isDM: boolean;
}

// Posts carrying a conversation_id render with the new conversation-entity
// pipeline (plugin >= 2.0); everything else falls back to the legacy renderer.
const AgentPost = (props: AgentPostProps) => {
    const postProps = props.post.props as Record<string, unknown> | undefined;
    const rawConversationId = postProps?.conversation_id;
    const conversationId = typeof rawConversationId === 'string' && rawConversationId !== '' ? rawConversationId : undefined;

    if (conversationId) {
        return (
            <AgentPostNew
                {...props}
                conversationId={conversationId}
            />
        );
    }

    return <AgentPostLegacy {...props}/>;
};

export default AgentPost;
