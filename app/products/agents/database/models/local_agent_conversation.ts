// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {children, field} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {AGENTS_TABLES} from '@agents/constants/database';

import type LocalAgentConversationModelInterface from '@agents/types/database/models/local_agent_conversation';
import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';
import type {Query} from '@nozbe/watermelondb';

const {LOCAL_AGENT_CONVERSATION, LOCAL_AGENT_MESSAGE} = AGENTS_TABLES;

/**
 * A local-only on-device agent conversation. Never synced to the server.
 */
export default class LocalAgentConversationModel extends Model implements LocalAgentConversationModelInterface {
    static table = LOCAL_AGENT_CONVERSATION;

    static associations: Associations = {
        [LOCAL_AGENT_MESSAGE]: {type: 'has_many', foreignKey: 'conversation_id'},
    };

    @field('title') title!: string;
    @field('create_at') createAt!: number;
    @field('update_at') updateAt!: number;

    @children(LOCAL_AGENT_MESSAGE) messages!: Query<LocalAgentMessageModel>;
}
