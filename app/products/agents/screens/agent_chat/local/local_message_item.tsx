// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {Text, View} from 'react-native';

import StreamingIndicator from '@agents/components/agent_post/streaming_indicator';
import ReasoningDisplay from '@agents/components/reasoning_display';
import ToolCard from '@agents/components/tool_card';
import {LOCAL_AGENT_DISPLAY_NAME, LocalAgentMessageRole, LocalAgentMessageStatus} from '@agents/local/constants';
import {useStreamingState} from '@agents/store';
import {ToolApprovalStage, type ToolCall} from '@agents/types';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {safeParseJSON} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type LocalAgentMessageModel from '@agents/types/database/models/local_agent_message';

type Props = {
    message: LocalAgentMessageModel;
    currentUsername?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    author: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    roleBadge: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 50),
    },
    messageText: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    tools: {
        marginBottom: 8,
        gap: 8,
    },
    precontentText: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 100),
    },
    errorText: {
        color: theme.errorTextColor,
        marginTop: 4,
        ...typography('Body', 75),
    },
}));

const LocalMessageItem = ({message, currentUsername}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const streamingState = useStreamingState(serverUrl, message.id);
    const [collapsedTools, setCollapsedTools] = useState<Record<string, boolean>>({});

    const isUser = message.role === LocalAgentMessageRole.User;
    const isStreaming = message.status === LocalAgentMessageStatus.Streaming || Boolean(streamingState?.generating);
    const isPrecontent = Boolean(streamingState?.precontent);
    const displayMessage = streamingState?.message || message.message;
    const reasoning = streamingState?.reasoning || message.reasoning || '';
    const showReasoning = Boolean(streamingState?.showReasoning || reasoning);

    const toolCalls = useMemo((): ToolCall[] => {
        if (streamingState) {
            const byId = new Map<string, ToolCall>();
            for (const round of streamingState.rounds) {
                for (const tool of round.toolCalls) {
                    byId.set(tool.id, tool);
                }
            }
            for (const tool of streamingState.toolCalls) {
                byId.set(tool.id, tool);
            }
            return [...byId.values()];
        }
        if (!message.toolCalls) {
            return [];
        }
        const parsed = safeParseJSON(message.toolCalls);
        return Array.isArray(parsed) ? parsed as ToolCall[] : [];
    }, [streamingState, message.toolCalls]);

    const handleToggleTool = useCallback((toolId: string) => {
        setCollapsedTools((current) => ({
            ...current,
            [toolId]: current[toolId] === false,
        }));
    }, []);

    let author = LOCAL_AGENT_DISPLAY_NAME;
    if (isUser) {
        author = currentUsername ? `@${currentUsername}` : 'You';
    }

    let body = null;
    if (!isUser && isPrecontent) {
        body = (
            <View>
                <FormattedText
                    id='agents.generating'
                    defaultMessage='Generating response...'
                    style={styles.precontentText}
                />
                <StreamingIndicator/>
            </View>
        );
    } else if (displayMessage || (!isUser && isStreaming)) {
        body = (
            <View>
                {displayMessage && isUser && (
                    <Text style={styles.messageText}>{displayMessage}</Text>
                )}
                {displayMessage && !isUser && (
                    <Markdown
                        baseTextStyle={styles.messageText}
                        value={displayMessage}
                        theme={theme}
                        location={Screens.AGENT_CHAT}
                    />
                )}
                {!isUser && isStreaming && !isPrecontent && (
                    <StreamingIndicator/>
                )}
            </View>
        );
    }

    return (
        <View
            style={styles.container}
            testID={`agent_chat.local_message.${message.id}`}
        >
            <View style={styles.header}>
                <Text style={styles.author}>{author}</Text>
                <FormattedText
                    id={isUser ? 'agents.local.message.you' : 'agents.local.message.assistant'}
                    defaultMessage={isUser ? 'You' : 'On device'}
                    style={styles.roleBadge}
                />
            </View>

            {!isUser && showReasoning && (
                <ReasoningDisplay
                    reasoningSummary={reasoning}
                    isReasoningLoading={Boolean(streamingState?.isReasoningLoading)}
                />
            )}

            {!isUser && toolCalls.length > 0 && (
                <View style={styles.tools}>
                    {toolCalls.map((tool) => (
                        <ToolCard
                            key={tool.id}
                            tool={tool}
                            isCollapsed={collapsedTools[tool.id] !== false}
                            isProcessing={false}
                            approvalStage={ToolApprovalStage.Done}
                            canApprove={false}
                            canExpand={true}
                            showArguments={true}
                            showResults={true}
                            onToggleCollapse={handleToggleTool}
                        />
                    ))}
                </View>
            )}

            {body}

            {message.status === LocalAgentMessageStatus.Error && (
                <FormattedText
                    id='agents.local.message.error'
                    defaultMessage='Generation failed.'
                    style={styles.errorText}
                />
            )}
        </View>
    );
};

export default LocalMessageItem;
