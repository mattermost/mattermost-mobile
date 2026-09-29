// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type LocalAgentConversationModel from '@agents/types/database/models/local_agent_conversation';
import type {Model, Relation} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * A message in a local-only on-device agent conversation.
 */
declare class LocalAgentMessageModel extends Model {
    static table: string;
    static associations: Associations;

    conversationId: string;
    role: string;
    message: string;
    reasoning?: string | null;
    toolCalls?: string | null;
    status: string;
    createAt: number;
    conversation: Relation<LocalAgentConversationModel>;
}

export default LocalAgentMessageModel;
