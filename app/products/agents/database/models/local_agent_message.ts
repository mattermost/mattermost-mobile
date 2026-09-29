// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {AGENTS_TABLES} from '@agents/constants/database';

import type LocalAgentConversationModel from '@agents/types/database/models/local_agent_conversation';
import type LocalAgentMessageModelInterface from '@agents/types/database/models/local_agent_message';
import type {Relation} from '@nozbe/watermelondb';

const {LOCAL_AGENT_CONVERSATION, LOCAL_AGENT_MESSAGE} = AGENTS_TABLES;

/**
 * A message in a local-only on-device agent conversation.
 */
export default class LocalAgentMessageModel extends Model implements LocalAgentMessageModelInterface {
    static table = LOCAL_AGENT_MESSAGE;

    static associations: Associations = {
        [LOCAL_AGENT_CONVERSATION]: {type: 'belongs_to', key: 'conversation_id'},
    };

    @field('conversation_id') conversationId!: string;
    @field('role') role!: string;
    @field('message') message!: string;
    @field('reasoning') reasoning!: string | null | undefined;
    @field('tool_calls') toolCalls!: string | null | undefined;
    @field('status') status!: string;
    @field('create_at') createAt!: number;

    @immutableRelation(LOCAL_AGENT_CONVERSATION, 'conversation_id') conversation!: Relation<LocalAgentConversationModel>;
}
