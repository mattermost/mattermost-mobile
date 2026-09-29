// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addLocalMessage, updateLocalMessage} from '@agents/actions/local/local_agent';
import {getLocalAgentEngine} from '@agents/local/engine';
import {formatConversationHistory, runLocalAgentTurn} from '@agents/local/orchestrator';
import {executeLocalTool} from '@agents/local/tools';
import {streamingStore} from '@agents/store';
import DatabaseManager from '@database/manager';

jest.mock('@agents/actions/local/local_agent', () => ({
    addLocalMessage: jest.fn(),
    updateLocalMessage: jest.fn(),
}));

jest.mock('@agents/local/engine', () => ({
    getLocalAgentEngine: jest.fn(),
}));

jest.mock('@agents/local/tools', () => ({
    executeLocalTool: jest.fn(),
}));

jest.mock('@agents/store', () => ({
    streamingStore: {
        handleWebSocketMessage: jest.fn(),
        removePost: jest.fn(),
    },
}));

jest.mock('@queries/servers/system', () => ({
    getCurrentUserId: jest.fn(async () => 'user-1'),
}));

jest.mock('@queries/servers/user', () => ({
    getUserById: jest.fn(async () => ({username: 'alice'})),
}));

describe('runLocalAgentTurn', () => {
    const serverUrl = 'local-agent-orchestrator.test.com';

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);

        jest.mocked(addLocalMessage).mockImplementation(async (_url, args) => ({
            data: {
                id: args.id || `msg-${args.role}`,
                conversationId: args.conversationId,
                role: args.role,
                message: args.message || '',
            } as never,
        }));
        jest.mocked(updateLocalMessage).mockResolvedValue({data: {} as never});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should short-circuit when the first step produces no tool call', async () => {
        const release = jest.fn(async () => undefined);
        const executeWithEvents = jest.fn(async (_parts, onEvent) => {
            onEvent({type: 'token', text: 'Hello there', done: false});
            onEvent({type: 'token', text: '', done: true});
            return 'Hello there';
        });

        jest.mocked(getLocalAgentEngine).mockResolvedValue({
            createConversation: jest.fn(() => ({
                id: 'c1',
                executeWithEvents,
                release,
                execute: jest.fn(),
                getHistory: jest.fn(() => []),
            })),
        } as never);

        const result = await runLocalAgentTurn({
            serverUrl,
            conversationId: 'conv-1',
            userMessage: 'hi',
            priorTurns: [],
        });

        expect(result.error).toBeUndefined();
        expect(executeLocalTool).not.toHaveBeenCalled();
        expect(updateLocalMessage).toHaveBeenCalledWith(
            serverUrl,
            expect.any(String),
            expect.objectContaining({message: 'Hello there'}),
        );
        expect(streamingStore.removePost).toHaveBeenCalled();
        expect(release).toHaveBeenCalled();
    });

    it('should give the tool step the prior conversation, including tools used', async () => {
        const executeWithEvents = jest.fn(async (_parts, onEvent) => {
            onEvent({type: 'token', text: 'Shorter summary', done: false});
            onEvent({type: 'token', text: '', done: true});
            return 'Shorter summary';
        });

        jest.mocked(getLocalAgentEngine).mockResolvedValue({
            createConversation: jest.fn(() => ({
                id: 'c1',
                executeWithEvents,
                release: jest.fn(async () => undefined),
                execute: jest.fn(),
                getHistory: jest.fn(() => []),
            })),
        } as never);

        await runLocalAgentTurn({
            serverUrl,
            conversationId: 'conv-1',
            userMessage: 'Make it shorter',
            priorTurns: [
                {role: 'user', message: 'Summarize town square'},
                {role: 'assistant', message: 'Here is the summary.', toolCalls: [{name: 'read_channel', arguments: {channel_id: 'ch1'}}]},
            ],
        });

        const promptText = executeWithEvents.mock.calls[0][0][0].text;
        expect(promptText).toContain('User: Summarize town square');
        expect(promptText).toContain('Gemma [used read_channel {"channel_id":"ch1"}]: Here is the summary.');
        expect(promptText).toContain('New message from the user:\nMake it shorter');
    });

    it('should keep only the most recent turns in the history', () => {
        const turns = Array.from({length: 10}, (_, i) => ({role: 'user' as const, message: `message ${i}`}));
        const history = formatConversationHistory(turns);

        expect(history.split('\n')).toHaveLength(6);
        expect(history).not.toContain('message 3');
        expect(history).toContain('message 9');
    });

    it('should retry the answer step when it asks for a tool instead of answering', async () => {
        let conversationCount = 0;
        const answerExecute = jest.fn();

        jest.mocked(executeLocalTool).mockResolvedValue({
            forToolStep: '1 posts loaded',
            forAnswer: '[Mon 09:14] @alice: hello',
        });

        jest.mocked(getLocalAgentEngine).mockResolvedValue({
            createConversation: jest.fn(() => {
                conversationCount += 1;
                const isToolStep = conversationCount === 1;
                return {
                    id: `c${conversationCount}`,
                    release: jest.fn(async () => undefined),
                    getHistory: jest.fn(() => []),
                    execute: jest.fn(),
                    executeWithEvents: isToolStep ? jest.fn(async (_parts, onEvent) => {
                        if (jest.mocked(executeLocalTool).mock.calls.length === 0) {
                            onEvent({type: 'toolCall', text: '{"name":"read_channel","arguments":{"channel_id":"ch1"}}', done: false});
                        } else {
                            onEvent({type: 'token', text: 'Got it.', done: false});
                        }
                        onEvent({type: 'token', text: '', done: true});
                        return '';
                    }) : answerExecute,
                };
            }),
        } as never);

        answerExecute.
            mockImplementationOnce(async (_parts, onEvent) => {
                onEvent({type: 'toolCall', text: '{"name":"read_channel","arguments":{"channel_id":"ch1"}}', done: false});
                onEvent({type: 'token', text: '', done: true});
                return '';
            }).
            mockImplementationOnce(async (_parts, onEvent) => {
                onEvent({type: 'token', text: 'Summary bullets', done: false});
                onEvent({type: 'token', text: '', done: true});
                return 'Summary bullets';
            });

        const result = await runLocalAgentTurn({
            serverUrl,
            conversationId: 'conv-1',
            userMessage: 'Summarize town square',
            priorTurns: [],
        });

        expect(result.error).toBeUndefined();
        expect(answerExecute).toHaveBeenCalledTimes(2);
        expect(executeLocalTool).toHaveBeenCalledTimes(1);
        expect(updateLocalMessage).toHaveBeenCalledWith(
            serverUrl,
            expect.any(String),
            expect.objectContaining({message: 'Summary bullets'}),
        );
    });

    it('should run tools then answer in a second conversation', async () => {
        const release = jest.fn(async () => undefined);
        let conversationCount = 0;

        jest.mocked(executeLocalTool).mockResolvedValue({
            forToolStep: '1 posts loaded',
            forAnswer: '[Mon 09:14] @alice: hello',
        });

        jest.mocked(getLocalAgentEngine).mockResolvedValue({
            createConversation: jest.fn(() => {
                conversationCount += 1;
                const isToolStep = conversationCount === 1;
                return {
                    id: `c${conversationCount}`,
                    release,
                    getHistory: jest.fn(() => []),
                    execute: jest.fn(),
                    executeWithEvents: jest.fn(async (_parts, onEvent) => {
                        if (isToolStep) {
                            onEvent({type: 'toolCall', text: '{"name":"read_channel","arguments":{"channel_id":"ch1"}}', done: false});
                            onEvent({type: 'token', text: '', done: true});
                            return '';
                        }
                        onEvent({type: 'token', text: 'Summary bullets', done: false});
                        onEvent({type: 'token', text: '', done: true});
                        return 'Summary bullets';
                    }),
                };
            }),
        } as never);

        const result = await runLocalAgentTurn({
            serverUrl,
            conversationId: 'conv-1',
            userMessage: 'Summarize town square',
            priorTurns: [],
        });

        expect(result.error).toBeUndefined();
        expect(executeLocalTool).toHaveBeenCalledWith(expect.anything(), 'read_channel', {channel_id: 'ch1'});
        expect(conversationCount).toBe(2);
        expect(updateLocalMessage).toHaveBeenCalledWith(
            serverUrl,
            expect.any(String),
            expect.objectContaining({message: 'Summary bullets'}),
        );
    });
});
