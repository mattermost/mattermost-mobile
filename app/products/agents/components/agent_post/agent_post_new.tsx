// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import {refetchConversation} from '@agents/actions/remote/conversation';
import {regenerateResponse, stopGeneration} from '@agents/actions/remote/generation_controls';
import {isConversationRequester} from '@agents/requester';
import {useConversation, useTurnForPost} from '@agents/store/conversation_store';
import streamingStore, {useStreamingState} from '@agents/store/streaming_store';
import {
    anyToolHasArguments,
    anyToolHasResult,
    deriveApprovalStageForPost,
    extractAnnotationsFromTurn,
    extractReasoningFromTurn,
    extractToolCallsForPost,
} from '@agents/turn_content';
import {ToolApprovalStage, type Annotation, type ToolCall} from '@agents/types';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
            ...typography('Body', 200),
        },
        precontentContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
        },
        precontentText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontStyle: 'italic',
            marginRight: 8,
            ...typography('Body', 100),
        },
    };
});

export interface AgentPostNewProps {
    post: PostModel;
    conversationId: string;
    currentUserId?: string;
    location: AvailableScreens;
    isDM: boolean;
}

interface DisplayState {
    toolCalls: ToolCall[];
    annotations: Annotation[];
    reasoning: string;
    showReasoning: boolean;
    approvalStage: ToolApprovalStage;
}

const INITIAL_DISPLAY_STATE: DisplayState = {
    toolCalls: [],
    annotations: [],
    reasoning: '',
    showReasoning: false,
    approvalStage: ToolApprovalStage.Call,
};

// Buffers tool calls / reasoning / annotations through the brief window
// between POST_EDITED clearing the streaming store and the invalidated
// conversation fetch resolving with fresh turn data.
const AgentPostNew = ({post, conversationId, currentUserId, location, isDM}: AgentPostNewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const {conversation, loading: conversationLoading, error: conversationError} = useConversation(serverUrl, conversationId);
    const turn = useTurnForPost(conversation, post.id);

    const streamingState = useStreamingState(serverUrl, post.id);
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;

    const [displayState, setDisplayState] = useState<DisplayState>(INITIAL_DISPLAY_STATE);
    const {toolCalls, annotations, reasoning, showReasoning, approvalStage} = displayState;

    // Skip while streaming or when the anchor turn is missing so a stale
    // conversation doesn't overwrite data already received over the wire.
    useEffect(() => {
        if (!conversation || !turn || isGenerating) {
            return;
        }
        const reasoningText = extractReasoningFromTurn(turn).summary;
        setDisplayState({
            toolCalls: extractToolCallsForPost(conversation, post.id),
            annotations: extractAnnotationsFromTurn(turn),
            reasoning: reasoningText,
            showReasoning: reasoningText !== '',
            approvalStage: deriveApprovalStageForPost(conversation, post.id),
        });
    }, [conversation, turn, post.id, isGenerating]);

    // Only update on non-empty streaming values; handleRegenerate clears state on restart.
    useEffect(() => {
        if (!streamingState) {
            return;
        }
        setDisplayState((prev) => {
            const next: DisplayState = {...prev};
            let changed = false;
            if (streamingState.toolCalls.length > 0 && streamingState.toolCalls !== prev.toolCalls) {
                next.toolCalls = streamingState.toolCalls;
                changed = true;
            }
            if (streamingState.annotations.length > 0 && streamingState.annotations !== prev.annotations) {
                next.annotations = streamingState.annotations;
                changed = true;
            }
            if (streamingState.reasoning !== '' && streamingState.reasoning !== prev.reasoning) {
                next.reasoning = streamingState.reasoning;
                changed = true;
            }
            if (streamingState.showReasoning && !prev.showReasoning) {
                next.showReasoning = true;
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [streamingState]);

    // Invalidate the cached conversation when a stream finishes so the next
    // fetch surfaces the finalised turn.
    const wasGeneratingRef = useRef(isGenerating);
    useEffect(() => {
        const wasGenerating = wasGeneratingRef.current;
        wasGeneratingRef.current = isGenerating;
        if (wasGenerating && !isGenerating) {
            refetchConversation(serverUrl, conversationId);
        }
    }, [serverUrl, conversationId, isGenerating]);

    const displayMessage = streamingState?.message ?? post.message ?? '';

    const isRequester = isConversationRequester({post, conversation, currentUserId});
    const canApprove = isRequester;
    const canExpand = isDM || isRequester;

    // The server filters per-user already, so non-DMs hide tools whose
    // arguments/results were redacted for this viewer.
    const showArguments = isDM || anyToolHasArguments(toolCalls);
    const showResults = isDM || anyToolHasResult(toolCalls);

    const isGenerationInProgress = isGenerating || isReasoningLoading;

    const showStopButton = isGenerationInProgress && isRequester;
    const hasContent = displayMessage !== '' || reasoning !== '';
    const showRegenerateButton = !isGenerationInProgress && isRequester && hasContent && isDM;

    const handleStop = useCallback(async () => {
        const {error} = await stopGeneration(serverUrl, post.id);
        if (error) {
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_STOP_ERROR});
        }
    }, [serverUrl, post.id]);

    const handleRegenerate = useCallback(async () => {
        // Clear local display + streaming store so the new stream starts from
        // a clean slate instead of showing the previous round's data.
        setDisplayState(INITIAL_DISPLAY_STATE);
        streamingStore.removePost(serverUrl, post.id);
        const {error} = await regenerateResponse(serverUrl, post.id);
        if (error) {
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_REGENERATE_ERROR});
        }
    }, [serverUrl, post.id]);

    return (
        <View style={styles.container}>
            {conversationError && !isGenerating && !conversationLoading ? (
                <FormattedText
                    id='agents.conversation.load_error'
                    defaultMessage='Failed to load conversation data'
                    style={styles.precontentText}
                />
            ) : null}
            {showReasoning && (
                <ReasoningDisplay
                    reasoningSummary={reasoning}
                    isReasoningLoading={isReasoningLoading}
                />
            )}
            {isPrecontent && (
                <View style={styles.precontentContainer}>
                    <FormattedText
                        id='agents.generating'
                        defaultMessage='Generating response...'
                        style={styles.precontentText}
                    />
                    <StreamingIndicator/>
                </View>
            )}
            {toolCalls.length > 0 && (
                <ToolApprovalSet
                    postId={post.id}
                    toolCalls={toolCalls}
                    approvalStage={approvalStage}
                    canApprove={canApprove}
                    canExpand={canExpand}
                    showArguments={showArguments}
                    showResults={showResults}
                />
            )}
            {!isPrecontent && (displayMessage || isGenerating) && (
                <View style={styles.messageContainer}>
                    {displayMessage ? (
                        <Markdown
                            baseTextStyle={styles.messageText}
                            value={displayMessage}
                            theme={theme}
                            location={location}
                        />
                    ) : null}
                    {isGenerating && (
                        <StreamingIndicator/>
                    )}
                </View>
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

export default AgentPostNew;
