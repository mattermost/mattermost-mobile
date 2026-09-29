// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {AGENTS_TABLES} from '@agents/constants/database';

import type LocalAgentConversationModel from '@agents/types/database/models/local_agent_conversation';
import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';

const {LOCAL_AGENT_CONVERSATION, LOCAL_AGENT_MESSAGE} = AGENTS_TABLES;

export function queryLocalConversations(database: Database) {
    return database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).query(
        Q.sortBy('update_at', Q.desc),
    );
}

export function observeLocalConversations(database: Database) {
    return queryLocalConversations(database).observeWithColumns(['title', 'update_at']);
}

export async function getLocalConversationById(database: Database, conversationId: string) {
    try {
        return await database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).find(conversationId);
    } catch {
        return undefined;
    }
}

export function observeLocalConversationById(database: Database, conversationId: string) {
    return database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).query(
        Q.where('id', conversationId),
        Q.take(1),
    ).observe().pipe(
        switchMap((conversations) => {
            return conversations.length ? conversations[0].observe() : of$(undefined);
        }),
    );
}

export function queryLocalMessages(database: Database, conversationId: string) {
    return database.get<LocalAgentMessageModel>(LOCAL_AGENT_MESSAGE).query(
        Q.where('conversation_id', conversationId),
        Q.sortBy('create_at', Q.asc),
    );
}

export function observeLocalMessages(database: Database, conversationId: string) {
    return queryLocalMessages(database, conversationId).observeWithColumns([
        'message',
        'reasoning',
        'tool_calls',
        'status',
    ]);
}

export async function getLocalMessageById(database: Database, messageId: string) {
    try {
        return await database.get<LocalAgentMessageModel>(LOCAL_AGENT_MESSAGE).find(messageId);
    } catch {
        return undefined;
    }
}

export async function getLocalMessages(database: Database, conversationId: string) {
    return queryLocalMessages(database, conversationId).fetch();
}
