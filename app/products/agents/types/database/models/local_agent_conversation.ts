// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';
import type {Model, Query} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * A local-only on-device agent conversation. Never synced to the server.
 */
declare class LocalAgentConversationModel extends Model {
    static table: string;
    static associations: Associations;

    title: string;
    createAt: number;
    updateAt: number;
    messages: Query<LocalAgentMessageModel>;
}

export default LocalAgentConversationModel;
