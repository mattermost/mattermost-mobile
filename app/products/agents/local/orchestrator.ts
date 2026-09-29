// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addLocalMessage, updateLocalMessage} from '@agents/actions/local/local_agent';
import {CONTROL_SIGNALS} from '@agents/constants';
import {
    LOCAL_AGENT_HISTORY_MAX_CHARS_PER_TURN,
    LOCAL_AGENT_HISTORY_MAX_TURNS,
    LOCAL_AGENT_MAX_TOOL_STEPS,
    LocalAgentMessageRole,
    LocalAgentMessageStatus,
} from '@agents/local/constants';
import {getLocalAgentEngine} from '@agents/local/engine';
import {buildAnswerStepSystemPrompt, buildToolStepSystemPrompt} from '@agents/local/prompts';
import {logStepStats, logToolStats, logTurnStats, startTurnStats} from '@agents/local/stats';
import {executeLocalTool} from '@agents/local/tools';
import {streamingStore} from '@agents/store';
import {ToolCallStatus, type ToolCall} from '@agents/types';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';
import {getUserById} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {generateId} from '@utils/general';
import {logDebug, logError} from '@utils/log';

import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';
import type {ConversationHandle, LiteRTLMInstance, StreamEvent} from 'react-native-litert-lm';

export type PriorTurn = {
    role: 'user' | 'assistant';
    message: string;
    toolCalls?: Array<{name: string; arguments: unknown}>;
};

type RunLocalAgentTurnArgs = {
    serverUrl: string;
    conversationId: string;
    userMessage: string;
    priorTurns: PriorTurn[];
    signal?: AbortSignal;
};

type ParsedToolCall = {
    name: string;
    arguments: Record<string, unknown>;
};

function formatNow(): string {
    return new Date().toISOString();
}

function truncateText(text: string, maxChars: number): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > maxChars ? `${oneLine.slice(0, maxChars - 1)}…` : oneLine;
}

/**
 * Compact transcript of the most recent turns. Assistant turns keep a note of the tools they used
 * (with arguments such as channel ids) so follow-ups can re-read the same data without it being replayed.
 */
export function formatConversationHistory(priorTurns: PriorTurn[]): string {
    return priorTurns.slice(-LOCAL_AGENT_HISTORY_MAX_TURNS).map((turn) => {
        const text = truncateText(turn.message, LOCAL_AGENT_HISTORY_MAX_CHARS_PER_TURN);
        if (turn.role === 'user') {
            return `User: ${text}`;
        }

        const tools = turn.toolCalls?.length ? ` [used ${turn.toolCalls.map((tool) => `${tool.name} ${JSON.stringify(tool.arguments)}`).join('; ')}]` : '';
        return `Gemma${tools}: ${text}`;
    }).join('\n');
}

async function resolveUsername(serverUrl: string): Promise<string> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
        const user = userId ? await getUserById(database, userId) : undefined;
        return user?.username || 'me';
    } catch {
        return 'me';
    }
}

function parseToolCallPayload(raw: string): ParsedToolCall | undefined {
    const trimmed = raw.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        let name: string | undefined;
        if (typeof parsed.name === 'string') {
            name = parsed.name;
        } else if (parsed.function && typeof parsed.function === 'object') {
            const fnName = (parsed.function as {name?: string}).name;
            if (typeof fnName === 'string') {
                name = fnName;
            }
        }
        if (!name) {
            return undefined;
        }

        let args: Record<string, unknown> = {};
        if (parsed.arguments && typeof parsed.arguments === 'object') {
            args = parsed.arguments as Record<string, unknown>;
        } else if (typeof parsed.arguments === 'string') {
            try {
                args = JSON.parse(parsed.arguments) as Record<string, unknown>;
            } catch {
                args = {raw: parsed.arguments};
            }
        } else if (parsed.parameters && typeof parsed.parameters === 'object') {
            args = parsed.parameters as Record<string, unknown>;
        } else if (parsed.function && typeof parsed.function === 'object') {
            const fn = parsed.function as {arguments?: unknown; parameters?: unknown};
            if (fn.arguments && typeof fn.arguments === 'object') {
                args = fn.arguments as Record<string, unknown>;
            } else if (typeof fn.arguments === 'string') {
                try {
                    args = JSON.parse(fn.arguments) as Record<string, unknown>;
                } catch {
                    args = {raw: fn.arguments};
                }
            } else if (fn.parameters && typeof fn.parameters === 'object') {
                args = fn.parameters as Record<string, unknown>;
            }
        }

        return {name, arguments: args};
    } catch {
        return undefined;
    }
}

function emitToolCalls(serverUrl: string, messageId: string, toolCalls: ToolCall[]) {
    streamingStore.handleWebSocketMessage(serverUrl, {
        post_id: messageId,
        control: CONTROL_SIGNALS.TOOL_CALL,
        tool_call: JSON.stringify(toolCalls),
    });
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
        const error = new Error('cancelled');
        error.name = 'AbortError';
        throw error;
    }
}

async function runConversationTurn(
    llm: LiteRTLMInstance,
    step: string,
    conversation: ConversationHandle,
    text: string,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
): Promise<string> {
    throwIfAborted(signal);
    const startedAt = Date.now();
    let firstOutputAt: number | undefined;
    const response = await conversation.executeWithEvents([{type: 'text', text}], (event) => {
        if (firstOutputAt === undefined && event.text) {
            firstOutputAt = Date.now();
        }
        if (signal?.aborted) {
            return;
        }
        onEvent(event);
    });
    logStepStats(llm, step, {startedAt, firstOutputAt, endedAt: Date.now()});
    return response;
}

type StreamAnswerArgs = {
    llm: LiteRTLMInstance;
    serverUrl: string;
    assistantMessageId: string;
    conversation: ConversationHandle;
    step: string;
    text: string;
    signal?: AbortSignal;
};

type StreamedAnswer = {
    text: string;
    reasoning: string;
    toolCallChars: number;
};

async function streamAnswer({llm, serverUrl, assistantMessageId, conversation, step, text, signal}: StreamAnswerArgs): Promise<StreamedAnswer> {
    let answerText = '';
    let reasoning = '';
    let toolCallChars = 0;

    await runConversationTurn(llm, step, conversation, text, (event) => {
        switch (event.type) {
            case 'token':
                answerText += event.text;
                streamingStore.handleWebSocketMessage(serverUrl, {
                    post_id: assistantMessageId,
                    next: answerText,
                });
                break;
            case 'thinking':
                reasoning += event.text;
                streamingStore.handleWebSocketMessage(serverUrl, {
                    post_id: assistantMessageId,
                    control: CONTROL_SIGNALS.REASONING_SUMMARY,
                    reasoning,
                });
                break;
            case 'toolCall':
                toolCallChars += event.text.length;
                break;
            default: {
                const exhaustiveCheck: never = event.type;
                throw new Error(`Unhandled stream event: ${exhaustiveCheck}`);
            }
        }
    }, signal);

    if (reasoning) {
        streamingStore.handleWebSocketMessage(serverUrl, {
            post_id: assistantMessageId,
            control: CONTROL_SIGNALS.REASONING_SUMMARY_DONE,
            reasoning,
        });
    }

    return {text: answerText.trim(), reasoning, toolCallChars};
}

export async function runLocalAgentTurn({
    serverUrl,
    conversationId,
    userMessage,
    priorTurns,
    signal,
}: RunLocalAgentTurnArgs): Promise<{data?: LocalAgentMessageModel; error?: unknown}> {
    const assistantMessageId = generateId();
    let persistedToolCalls: ToolCall[] = [];
    let finalMessage = '';
    let finalReasoning = '';

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const username = await resolveUsername(serverUrl);
        const promptContext = {dateTime: formatNow(), username};

        const userResult = await addLocalMessage(serverUrl, {
            conversationId,
            role: LocalAgentMessageRole.User,
            message: userMessage,
            status: LocalAgentMessageStatus.Complete,
        });
        if (userResult.error || !userResult.data) {
            return {error: userResult.error || new Error('Failed to save user message')};
        }

        const assistantResult = await addLocalMessage(serverUrl, {
            id: assistantMessageId,
            conversationId,
            role: LocalAgentMessageRole.Assistant,
            message: '',
            status: LocalAgentMessageStatus.Streaming,
        });
        if (assistantResult.error || !assistantResult.data) {
            return {error: assistantResult.error || new Error('Failed to create assistant message')};
        }

        streamingStore.handleWebSocketMessage(serverUrl, {
            post_id: assistantMessageId,
            control: CONTROL_SIGNALS.START,
        });

        const llm = await getLocalAgentEngine();
        throwIfAborted(signal);
        const turnStartedAt = startTurnStats(llm);

        const answerBlocks: string[] = [];
        let usedTools = false;
        let shortCircuitAnswer = '';
        const historyBlock = formatConversationHistory(priorTurns);

        const toolConversation = llm.createConversation({
            systemPrompt: buildToolStepSystemPrompt(promptContext),
        });

        try {
            let nextUserText = historyBlock ? `Conversation so far:\n${historyBlock}\n\nNew message from the user:\n${userMessage}` : userMessage;

            for (let step = 0; step < LOCAL_AGENT_MAX_TOOL_STEPS; step++) {
                throwIfAborted(signal);

                let tokenText = '';
                let toolCallBuffer = '';
                let reasoningText = '';

                // Sequential tool steps on purpose: each call depends on prior results.
                // eslint-disable-next-line no-await-in-loop
                await runConversationTurn(llm, `tool_step_${step + 1}`, toolConversation, nextUserText, (event) => {
                    switch (event.type) {
                        case 'token':
                            tokenText += event.text;
                            break;
                        case 'toolCall':
                            toolCallBuffer += event.text;
                            break;
                        case 'thinking':
                            reasoningText += event.text;
                            streamingStore.handleWebSocketMessage(serverUrl, {
                                post_id: assistantMessageId,
                                control: CONTROL_SIGNALS.REASONING_SUMMARY,
                                reasoning: reasoningText,
                            });
                            break;
                        default: {
                            const exhaustiveCheck: never = event.type;
                            throw new Error(`Unhandled stream event: ${exhaustiveCheck}`);
                        }
                    }
                }, signal);

                if (reasoningText) {
                    streamingStore.handleWebSocketMessage(serverUrl, {
                        post_id: assistantMessageId,
                        control: CONTROL_SIGNALS.REASONING_SUMMARY_DONE,
                        reasoning: reasoningText,
                    });
                    finalReasoning = reasoningText;
                }

                const parsed = parseToolCallPayload(toolCallBuffer);
                if (!parsed && toolCallBuffer.trim()) {
                    logDebug('LocalAgent.orchestrator: tool call could not be parsed', {step: step + 1, toolCallChars: toolCallBuffer.length});
                }
                if (!parsed) {
                    if (step === 0) {
                        shortCircuitAnswer = tokenText.trim();
                    }
                    break;
                }

                usedTools = true;
                const toolId = generateId('tool');
                const pendingCall: ToolCall = {
                    id: toolId,
                    name: parsed.name,
                    description: parsed.name,
                    arguments: parsed.arguments,
                    status: ToolCallStatus.Pending,
                    would_auto_execute: true,
                };
                persistedToolCalls = [...persistedToolCalls, pendingCall];

                // One call per event: the streaming store snapshots resolved calls into rounds and clears its live list.
                emitToolCalls(serverUrl, assistantMessageId, [pendingCall]);

                const toolStartedAt = Date.now();

                // eslint-disable-next-line no-await-in-loop -- tools must run one at a time
                const result = await executeLocalTool(database, parsed.name, parsed.arguments);
                logToolStats(parsed.name, Date.now() - toolStartedAt, result.forAnswer.length);
                answerBlocks.push(`### ${parsed.name}\n${result.forAnswer}`);

                const completedCall: ToolCall = {
                    ...pendingCall,
                    status: ToolCallStatus.Success,
                    result: result.forToolStep,
                };
                persistedToolCalls = persistedToolCalls.map((tc) => (tc.id === toolId ? completedCall : tc));
                emitToolCalls(serverUrl, assistantMessageId, [completedCall]);

                nextUserText = [
                    `Tool ${parsed.name} returned:`,
                    result.forToolStep,
                    'If you need another tool, call it. Otherwise reply with a short acknowledgment that you have enough information.',
                ].join('\n');
            }
        } finally {
            await toolConversation.release();
        }

        throwIfAborted(signal);

        if (!usedTools && shortCircuitAnswer) {
            finalMessage = shortCircuitAnswer;
            streamingStore.handleWebSocketMessage(serverUrl, {
                post_id: assistantMessageId,
                next: finalMessage,
            });
        } else {
            const answerConversation = llm.createConversation({
                systemPrompt: buildAnswerStepSystemPrompt(promptContext),
            });

            try {
                const toolBlock = answerBlocks.length ? answerBlocks.join('\n\n') : '(no tool results)';
                const prompt = [
                    'Prior conversation:',
                    historyBlock || '(none)',
                    '',
                    'User question:',
                    userMessage,
                    '',
                    'Tool results:',
                    toolBlock,
                    '',
                    'Answer the user question now.',
                ].join('\n');

                const answerArgs = {llm, serverUrl, assistantMessageId, conversation: answerConversation, signal};
                let answer = await streamAnswer({...answerArgs, step: 'answer_step', text: prompt});

                // Tool definitions are engine-wide, so the answer step can still ask for a tool instead of answering.
                if (!answer.text && answer.toolCallChars > 0) {
                    logDebug('LocalAgent.orchestrator: answer step requested a tool, retrying without tools', {toolCallChars: answer.toolCallChars});
                    answer = await streamAnswer({
                        ...answerArgs,
                        step: 'answer_step_retry',
                        text: 'Tools are not available in this step. All tool results are already above. Write the answer to the user question now.',
                    });
                }

                if (!answer.text) {
                    logDebug('LocalAgent.orchestrator: answer step produced no text', {toolCallChars: answer.toolCallChars, reasoningChars: answer.reasoning.length});
                }

                finalReasoning = answer.reasoning || finalReasoning;
                finalMessage = answer.text;
            } finally {
                await answerConversation.release();
            }
        }

        throwIfAborted(signal);

        streamingStore.handleWebSocketMessage(serverUrl, {
            post_id: assistantMessageId,
            control: CONTROL_SIGNALS.END,
        });

        const updated = await updateLocalMessage(serverUrl, assistantMessageId, {
            message: finalMessage || 'I could not generate a response.',
            reasoning: finalReasoning || undefined,
            toolCalls: persistedToolCalls,
            status: LocalAgentMessageStatus.Complete,
        });

        streamingStore.removePost(serverUrl, assistantMessageId);
        logTurnStats(llm, {
            startedAt: turnStartedAt,
            toolNames: persistedToolCalls.map((tool) => tool.name),
            answeredInToolStep: !usedTools && Boolean(shortCircuitAnswer),
        });
        return {data: updated.data};
    } catch (error) {
        const cancelled = (error instanceof Error && error.name === 'AbortError') || signal?.aborted;
        logDebug('LocalAgent.orchestrator: turn ended', {cancelled: Boolean(cancelled)});

        if (!cancelled) {
            logError('error on runLocalAgentTurn', getFullErrorMessage(error));
        }

        streamingStore.handleWebSocketMessage(serverUrl, {
            post_id: assistantMessageId,
            control: cancelled ? CONTROL_SIGNALS.CANCEL : CONTROL_SIGNALS.END,
        });

        let errorMessage = finalMessage || 'Something went wrong while generating a response.';
        if (cancelled) {
            errorMessage = finalMessage || 'Cancelled.';
        }

        await updateLocalMessage(serverUrl, assistantMessageId, {
            message: errorMessage,
            reasoning: finalReasoning || undefined,
            toolCalls: persistedToolCalls,
            status: cancelled ? LocalAgentMessageStatus.Cancelled : LocalAgentMessageStatus.Error,
        });
        streamingStore.removePost(serverUrl, assistantMessageId);

        return cancelled ? {} : {error};
    }
}
