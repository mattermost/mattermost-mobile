// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    addLocalMessage,
    createLocalConversation,
    deleteLocalConversation,
    updateLocalMessage,
} from '@agents/actions/local/local_agent';
import {AGENTS_TABLES} from '@agents/constants/database';
import {LocalAgentMessageRole, LocalAgentMessageStatus} from '@agents/local/constants';
import DatabaseManager from '@database/manager';

const serverUrl = 'local-agent-actions.test.com';
let mockIdCounter = 0;

jest.mock('@utils/general', () => {
    const original = jest.requireActual('@utils/general');
    return {
        ...original,
        generateId: jest.fn((prefix?: string) => {
            mockIdCounter += 1;
            return prefix ? `${prefix}-${mockIdCounter}` : `id-${mockIdCounter}`;
        }),
    };
});

describe('local agent actions', () => {
    beforeEach(async () => {
        mockIdCounter = 0;
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should create a conversation and add messages', async () => {
        const created = await createLocalConversation(serverUrl, 'New chat');
        expect(created.error).toBeUndefined();
        expect(created.data?.title).toBe('New chat');

        const userMessage = await addLocalMessage(serverUrl, {
            conversationId: created.data!.id,
            role: LocalAgentMessageRole.User,
            message: 'Summarize town square please',
        });
        expect(userMessage.error).toBeUndefined();
        expect(userMessage.data?.message).toBe('Summarize town square please');

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const conversation = await database.get(AGENTS_TABLES.LOCAL_AGENT_CONVERSATION).find(created.data!.id);
        expect((conversation as unknown as {title: string}).title).toBe('Summarize town square please');

        const assistant = await addLocalMessage(serverUrl, {
            conversationId: created.data!.id,
            role: LocalAgentMessageRole.Assistant,
            message: '',
            status: LocalAgentMessageStatus.Streaming,
        });
        expect(assistant.error).toBeUndefined();

        const updated = await updateLocalMessage(serverUrl, assistant.data!.id, {
            message: 'Here is a summary.',
            status: LocalAgentMessageStatus.Complete,
            toolCalls: [{
                id: 'tool-1',
                name: 'find_channel',
                description: 'find_channel',
                arguments: {query: 'town'},
                status: 4,
            }],
        });
        expect(updated.error).toBeUndefined();
        expect(updated.data?.message).toBe('Here is a summary.');
        expect(updated.data?.toolCalls).toContain('find_channel');
    });

    it('should delete a conversation and its messages', async () => {
        const created = await createLocalConversation(serverUrl);
        await addLocalMessage(serverUrl, {
            conversationId: created.data!.id,
            role: LocalAgentMessageRole.User,
            message: 'hello',
        });

        const deleted = await deleteLocalConversation(serverUrl, created.data!.id);
        expect(deleted.error).toBeUndefined();

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await expect(database.get(AGENTS_TABLES.LOCAL_AGENT_CONVERSATION).find(created.data!.id)).rejects.toBeTruthy();
    });
});
