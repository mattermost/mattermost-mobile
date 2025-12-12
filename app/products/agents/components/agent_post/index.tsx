// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {regenerateResponse, stopGeneration} from '@agents/actions/remote/generation_controls';
import {useStreamingState} from '@agents/store/streaming_store';
import {type Annotation, type ToolCall} from '@agents/types';
import {isPostRequester} from '@agents/utils';
import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {safeParseJSON} from '@utils/helpers';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CitationsList from '../citations_list';
import ControlsBar from '../controls_bar';
import ReasoningDisplay from '../reasoning_display';
import ToolApprovalSet from '../tool_approval_set';

import StreamingIndicator from './streaming_indicator';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
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
    };
});

interface AgentPostProps {
    post: PostModel;
    currentUserId?: string;
    location: AvailableScreens;
}

/**
 * Custom post component for agent responses
 * Handles streaming text updates and displays animated cursor during generation
 */
const AgentPost = ({post, currentUserId, location}: AgentPostProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    // Extract persisted reasoning from post props
    const persistedReasoning = useMemo(() => {
        const props = post.props as Record<string, unknown>;
        return (props?.reasoning_summary as string) || '';
    }, [post.props]);

    // Extract persisted tool calls from post props
    const persistedToolCalls = useMemo((): ToolCall[] => {
        const props = post.props as Record<string, unknown>;
        const toolCallsJson = props?.pending_tool_call as string;
        if (toolCallsJson) {
            const parsed = safeParseJSON(toolCallsJson);
            return Array.isArray(parsed) ? parsed as ToolCall[] : [];
        }
        return [];
    }, [post.props]);

    // Extract persisted annotations from post props
    const persistedAnnotations = useMemo((): Annotation[] => {
        const props = post.props as Record<string, unknown>;
        const annotationsJson = props?.annotations as string;
        if (annotationsJson) {
            const parsed = safeParseJSON(annotationsJson);
            return Array.isArray(parsed) ? parsed as Annotation[] : [];
        }
        return [];
    }, [post.props]);

    // Subscribe to streaming state via observable
    const streamingState = useStreamingState(post.id);

    // Determine the message to display (use ?? not || to preserve empty string during streaming)
    const displayMessage = streamingState?.message ?? post.message ?? '';
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;

    // Determine reasoning state - use streaming state if available, otherwise use persisted
    const reasoningSummary = streamingState?.reasoning ?? persistedReasoning;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;
    const showReasoning = streamingState?.showReasoning ?? (persistedReasoning !== '');

    // Determine tool calls - use streaming state if available, otherwise use persisted
    const toolCalls = streamingState?.toolCalls ?? persistedToolCalls;

    // Determine annotations - use streaming state if available, otherwise use persisted
    const annotations = streamingState?.annotations ?? persistedAnnotations;

    // Check permissions
    const isRequester = useMemo(() => {
        return currentUserId ? isPostRequester(post, currentUserId) : false;
    }, [post, currentUserId]);

    // Determine if generation is in progress (generating or reasoning)
    const isGenerationInProgress = isGenerating || isReasoningLoading;

    // Show controls based on state and permissions
    const showStopButton = isGenerationInProgress && isRequester;
    const hasContent = displayMessage !== '' || reasoningSummary !== '';
    const showRegenerateButton = !isGenerationInProgress && isRequester && hasContent;

    // Handler for stop button
    const handleStop = useCallback(async () => {
        const {error} = await stopGeneration(serverUrl, post.id);
        if (error) {
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_STOP_ERROR});
        }
    }, [serverUrl, post.id]);

    // Handler for regenerate button
    const handleRegenerate = useCallback(async () => {
        const {error} = await regenerateResponse(serverUrl, post.id);
        if (error) {
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_REGENERATE_ERROR});
        }
    }, [serverUrl, post.id]);

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
                            location={location}
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
            {(showStopButton || showRegenerateButton) && (
                <ControlsBar
                    showStopButton={showStopButton}
                    showRegenerateButton={showRegenerateButton}
                    onStop={handleStop}
                    onRegenerate={handleRegenerate}
                />
            )}
        </View>
    );
};

export default AgentPost;
