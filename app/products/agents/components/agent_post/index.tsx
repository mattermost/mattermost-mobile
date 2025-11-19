// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import streamingStore from '@agents/store/streaming_store';
import {StreamingEvents, type StreamingState} from '@agents/types';
import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, StyleSheet, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CitationsList from '../citations_list';
import ReasoningDisplay from '../reasoning_display';
import ToolApprovalSet from '../tool_approval_set';

import StreamingIndicator from './streaming_indicator';

import type PostModel from '@typings/database/models/servers/post';

interface AgentPostProps {
    serverUrl: string;
    post: PostModel;
}

/**
 * Custom post component for agent responses
 * Handles streaming text updates and displays animated cursor during generation
 */
const AgentPost = ({post}: AgentPostProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // Extract persisted reasoning from post props
    const persistedReasoning = useMemo(() => {
        try {
            const props = post.props as Record<string, unknown>;
            return (props?.reasoning_summary as string) || '';
        } catch {
            return '';
        }
    }, [post.props]);

    // Extract persisted tool calls from post props
    const persistedToolCalls = useMemo(() => {
        try {
            const props = post.props as Record<string, unknown>;
            const toolCallsJson = props?.pending_tool_call as string;
            if (toolCallsJson) {
                return JSON.parse(toolCallsJson);
            }
            return [];
        } catch {
            return [];
        }
    }, [post.props]);

    // Extract persisted annotations from post props
    const persistedAnnotations = useMemo(() => {
        try {
            const props = post.props as Record<string, unknown>;
            const annotationsJson = props?.annotations as string;
            if (annotationsJson) {
                return JSON.parse(annotationsJson);
            }
            return [];
        } catch {
            return [];
        }
    }, [post.props]);

    // Local state for streaming
    const [streamingState, setStreamingState] = useState<StreamingState | undefined>(
        () => streamingStore.getStreamingState(post.id),
    );

    useEffect(() => {
        // Subscribe to streaming events for this specific post
        const handleStreamingUpdate = (state: StreamingState) => {
            setStreamingState({...state});
        };

        const startedListener = DeviceEventEmitter.addListener(
            `${StreamingEvents.STARTED}_${post.id}`,
            handleStreamingUpdate,
        );

        const updatedListener = DeviceEventEmitter.addListener(
            `${StreamingEvents.UPDATED}_${post.id}`,
            handleStreamingUpdate,
        );

        const endedListener = DeviceEventEmitter.addListener(
            `${StreamingEvents.ENDED}_${post.id}`,
            handleStreamingUpdate,
        );

        return () => {
            startedListener.remove();
            updatedListener.remove();
            endedListener.remove();
        };
    }, [post.id]);

    // Determine the message to display
    const displayMessage = streamingState?.message || post.message || '';
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;

    // Determine reasoning state - use streaming state if available, otherwise use persisted
    const reasoningSummary = streamingState?.reasoning || persistedReasoning;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;
    const showReasoning = streamingState?.showReasoning ?? (persistedReasoning !== '');

    // Determine tool calls - use streaming state if available, otherwise use persisted
    const toolCalls = streamingState?.toolCalls ?? persistedToolCalls;

    // Determine annotations - use streaming state if available, otherwise use persisted
    const annotations = streamingState?.annotations ?? persistedAnnotations;

    return (
        <View style={styles.container}>
            {showReasoning && (
                <ReasoningDisplay
                    reasoningSummary={reasoningSummary}
                    isReasoningLoading={isReasoningLoading}
                />
            )}
            {isPrecontent ? (
                <View style={styles.precontentContainer}>
                    <FormattedText
                        id='agents.generating'
                        defaultMessage='Generating response...'
                        style={styles.precontentText}
                    />
                    <StreamingIndicator/>
                </View>
            ) : (
                <View style={styles.messageContainer}>
                    {displayMessage ? (
                        <Markdown
                            baseTextStyle={styles.messageText}
                            value={displayMessage}
                            theme={theme}
                            location={Screens.CHANNEL}
                        />
                    ) : null}
                    {isGenerating && !isPrecontent && (
                        <StreamingIndicator/>
                    )}
                </View>
            )}
            {toolCalls.length > 0 && (
                <ToolApprovalSet
                    postId={post.id}
                    toolCalls={toolCalls}
                />
            )}
            {annotations.length > 0 && (
                <CitationsList annotations={annotations}/>
            )}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
        },
        messageContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
        },
        messageText: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        precontentContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
        },
        precontentText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 14,
            fontStyle: 'italic',
            marginRight: 8,
        },
    });
});

export default AgentPost;
