// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {
    LocalAgentMessageRole,
    LocalAgentMessageStatus,
    type LocalAgentMessageRole as LocalAgentMessageRoleType,
    type LocalAgentMessageStatus as LocalAgentMessageStatusType,
} from '@agents/local/constants';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {generateId} from '@utils/general';
import {logError} from '@utils/log';

import type {ToolCall} from '@agents/types';
import type LocalAgentConversationModel from '@agents/types/database/models/local_agent_conversation';
import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';

const {LOCAL_AGENT_CONVERSATION, LOCAL_AGENT_MESSAGE} = AGENTS_TABLES;

type AddLocalMessageArgs = {
    conversationId: string;
    role: LocalAgentMessageRoleType;
    message?: string;
    reasoning?: string;
    toolCalls?: ToolCall[];
    status?: LocalAgentMessageStatusType;
    id?: string;
    createAt?: number;
};

type UpdateLocalMessageArgs = {
    message?: string;
    reasoning?: string;
    toolCalls?: ToolCall[];
    status?: LocalAgentMessageStatusType;
};

function titleFromMessage(message: string): string {
    const trimmed = message.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
        return 'New chat';
    }
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

export async function createLocalConversation(serverUrl: string, title = 'New chat') {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const now = Date.now();
        const id = generateId();

        let conversation: LocalAgentConversationModel | undefined;
        await database.write(async () => {
            conversation = await database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).create((record) => {
                record._raw.id = id;
                record.title = title;
                record.createAt = now;
                record.updateAt = now;
            });
        });

        return {data: conversation};
    } catch (error) {
        logError('error on createLocalConversation', getFullErrorMessage(error));
        return {error};
    }
}

export async function addLocalMessage(serverUrl: string, args: AddLocalMessageArgs) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const now = args.createAt ?? Date.now();
        const id = args.id ?? generateId();
        const status = args.status ?? LocalAgentMessageStatus.Complete;

        let message: LocalAgentMessageModel | undefined;
        await database.write(async () => {
            message = await database.get<LocalAgentMessageModel>(LOCAL_AGENT_MESSAGE).create((record) => {
                record._raw.id = id;
                record.conversationId = args.conversationId;
                record.role = args.role;
                record.message = args.message ?? '';
                record.reasoning = args.reasoning;
                record.toolCalls = args.toolCalls ? JSON.stringify(args.toolCalls) : undefined;
                record.status = status;
                record.createAt = now;
            });

            if (args.role === LocalAgentMessageRole.User) {
                const conversation = await database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).find(args.conversationId);
                await conversation.update((record) => {
                    if (record.title === 'New chat' && args.message) {
                        record.title = titleFromMessage(args.message);
                    }
                    record.updateAt = now;
                });
            } else {
                const conversation = await database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).find(args.conversationId);
                await conversation.update((record) => {
                    record.updateAt = now;
                });
            }
        });

        return {data: message};
    } catch (error) {
        logError('error on addLocalMessage', getFullErrorMessage(error));
        return {error};
    }
}

export async function updateLocalMessage(serverUrl: string, messageId: string, updates: UpdateLocalMessageArgs) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const existing = await database.get<LocalAgentMessageModel>(LOCAL_AGENT_MESSAGE).find(messageId);

        await database.write(async () => {
            await existing.update((record) => {
                if (updates.message !== undefined) {
                    record.message = updates.message;
                }
                if (updates.reasoning !== undefined) {
                    record.reasoning = updates.reasoning;
                }
                if (updates.toolCalls !== undefined) {
                    record.toolCalls = JSON.stringify(updates.toolCalls);
                }
                if (updates.status !== undefined) {
                    record.status = updates.status;
                }
            });

            const conversation = await database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).find(existing.conversationId);
            await conversation.update((record) => {
                record.updateAt = Date.now();
            });
        });

        return {data: existing};
    } catch (error) {
        logError('error on updateLocalMessage', getFullErrorMessage(error));
        return {error};
    }
}

export async function deleteLocalConversation(serverUrl: string, conversationId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const conversation = await database.get<LocalAgentConversationModel>(LOCAL_AGENT_CONVERSATION).find(conversationId);
        const messages = await conversation.messages.fetch();

        await database.write(async () => {
            await database.batch(
                ...messages.map((message) => message.prepareDestroyPermanently()),
                conversation.prepareDestroyPermanently(),
            );
        });

        return {};
    } catch (error) {
        logError('error on deleteLocalConversation', getFullErrorMessage(error));
        return {error};
    }
}
