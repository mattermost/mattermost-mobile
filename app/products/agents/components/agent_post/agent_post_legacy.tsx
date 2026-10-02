// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import {useGenerationControls} from '@agents/hooks/use_generation_controls';
import {useAgentsConfig} from '@agents/store/agents_config';
import {useStreamingState} from '@agents/store/streaming_store';
import {stripOpenAICitations} from '@agents/turn_content';
import {type Annotation, type ToolCall} from '@agents/types';
import {getToolApprovalStage, isPostRequester, isToolCallRedacted, isUnsafeLinksPost} from '@agents/utils';
import Markdown from '@components/markdown';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {safeParseJSON} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CitationsList from '../citations_list';
import ControlsBar from '../controls_bar';
import ReasoningDisplay from '../reasoning_display';
import ToolApprovalSet from '../tool_approval_set';

import StreamingIndicator from './streaming_indicator';
import WorkingIndicator from './working_indicator';

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
            ...typography('Body', 200),
        },
    };
});

export interface AgentPostLegacyProps {
    post: PostModel;
    currentUserId?: string;
    location: AvailableScreens;
    isDM: boolean;
}

/**
 * Agent post renderer for posts without a conversation entity (history from
 * before the plugin's conversation model). Sources tool calls, reasoning,
 * annotations, and redaction state from post props. Redacted tool payloads
 * stay hidden: the private-data endpoints were removed in plugin 2.0.
 */
const AgentPostLegacy = ({post, currentUserId, location, isDM}: AgentPostLegacyProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const {allowUnsafeLinks} = useAgentsConfig(serverUrl);
    const unsafeLinks = isUnsafeLinksPost(post, allowUnsafeLinks);

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
    const streamingState = useStreamingState(serverUrl, post.id);

    // Determine the message to display (use ?? not || to preserve empty string during streaming)
    const rawMessage = streamingState?.message ?? post.message ?? '';

    // Strip OpenAI-style "(source: https://…)" inline clutter from agent text
    // for both the streaming and the persisted message.
    const displayMessage = useMemo(() => stripOpenAICitations(rawMessage), [rawMessage]);
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;

    // Determine reasoning state - use streaming state if available, otherwise use persisted
    const reasoningSummary = streamingState?.reasoning ?? persistedReasoning;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;
    const showReasoning = streamingState?.showReasoning ?? (persistedReasoning !== '');

    // Determine tool calls - use streaming state if available, otherwise use
    // persisted. The streaming store snapshots completed rounds into `rounds`,
    // so flatten them back together with the current round to keep this legacy
    // renderer's single accumulated tool list.
    const toolCalls = useMemo(() => {
        if (!streamingState) {
            return persistedToolCalls;
        }
        return [...streamingState.rounds.flatMap((r) => r.toolCalls), ...streamingState.toolCalls];
    }, [streamingState, persistedToolCalls]);

    // Determine annotations - same flatten so snapshotted rounds' citations are kept.
    const annotations = useMemo(() => {
        if (!streamingState) {
            return persistedAnnotations;
        }
        return [...streamingState.rounds.flatMap((r) => r.annotations), ...streamingState.annotations];
    }, [streamingState, persistedAnnotations]);

    // Check permissions
    const isRequester = useMemo(() => {
        return currentUserId ? isPostRequester(post, currentUserId) : false;
    }, [post, currentUserId]);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- post.props is the reactive value that drives redaction state
    const isRedacted = useMemo(() => isToolCallRedacted(post), [post.props]);

    const approvalStage = useMemo(
        () => getToolApprovalStage(post, toolCalls),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- post.props drives stage changes
        [post.props, toolCalls],
    );

    const canApprove = isRequester;
    const canExpand = isRequester;
    const showToolPayloads = isDM || (isRequester && !isRedacted);

    // Determine if generation is in progress (generating or reasoning)
    const isGenerationInProgress = isGenerating || isReasoningLoading;

    // Show controls based on state and permissions
    const noRegenProp = (post.props as Record<string, unknown>)?.no_regen;
    const noRegen = noRegenProp === true || noRegenProp === 'true';
    const showStopButton = isGenerationInProgress && isRequester;
    const hasContent = displayMessage !== '' || reasoningSummary !== '';

    // The plugin creates the response post empty (and without a
    // conversation_id yet) before setup, so an empty post is still working.
    const showPlaceholder = isPrecontent || (!hasContent && toolCalls.length === 0);
    const showRegenerateButton = !isGenerationInProgress && isRequester && hasContent && isDM && !noRegen;

    const {stop: handleStop, regenerate: handleRegenerate} = useGenerationControls(post.id);

    return (
        <View style={styles.container}>
            {showReasoning && (
                <ReasoningDisplay
                    reasoningSummary={reasoningSummary}
                    isReasoningLoading={isReasoningLoading}
                />
            )}
            {showPlaceholder ? (
                <WorkingIndicator progressPhase={streamingState?.progressPhase}/>
            ) : (
                <View style={styles.messageContainer}>
                    {displayMessage ? (
                        <Markdown
                            baseTextStyle={styles.messageText}
                            value={displayMessage}
                            theme={theme}
                            location={location}
                            isUnsafeLinksPost={unsafeLinks}
                        />
                    ) : null}
                    {isGenerating && !isPrecontent && !isReasoningLoading && (
                        <StreamingIndicator/>
                    )}
                </View>
            )}
            {toolCalls.length > 0 && (
                <ToolApprovalSet
                    postId={post.id}
                    toolCalls={toolCalls}
                    approvalStage={approvalStage}
                    canApprove={canApprove}
                    canExpand={canExpand}
                    showArguments={showToolPayloads}
                    showResults={showToolPayloads}
                    unsafeLinks={unsafeLinks}
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

export default AgentPostLegacy;
