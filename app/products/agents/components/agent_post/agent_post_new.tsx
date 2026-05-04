// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {regenerateResponse, stopGeneration} from '@agents/actions/remote/generation_controls';
import {isConversationRequester} from '@agents/requester';
import {invalidateConversation, useConversation, useTurnForPost} from '@agents/store/conversation_store';
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
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

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

/**
 * Conversation-entity agent post renderer. Maintains local display state for
 * tool calls, reasoning, and annotations that is populated from two sources:
 *
 *   - Live streaming events while the assistant is generating — routed
 *     through the global streaming store and merged into local state as they
 *     arrive.
 *   - The finalized conversation entity once a stream finishes — the fetched
 *     turn is decoded into the same local state.
 *
 * Local state acts as a buffer so the UI keeps showing tools/reasoning
 * through the brief window between POST_EDITED clearing the streaming store
 * and the invalidated conversation fetch resolving with fresh turn data.
 */
const AgentPostNew = ({post, conversationId, currentUserId, location, isDM}: AgentPostNewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const {conversation, loading: conversationLoading, error: conversationError} = useConversation(serverUrl, conversationId);
    const turn = useTurnForPost(conversation, post.id);

    const streamingState = useStreamingState(post.id);
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;

    // Local display state — merged from conversation + streaming store so
    // nothing flickers during the stream-end handoff.
    const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [reasoning, setReasoning] = useState('');
    const [showReasoning, setShowReasoning] = useState(false);

    // Default to 'call' so pending tools get accept/reject buttons during
    // streaming, before the server writes the anchor turn with approval_state.
    const [approvalStage, setApprovalStage] = useState<ToolApprovalStage>(ToolApprovalStage.Call);

    // Populate from the conversation entity when a finalized turn for this
    // post is available and we're not actively streaming. Streaming events
    // take precedence while live, and we skip when the turn is missing so a
    // stale conversation (fetched before stream END wrote the anchor turn)
    // doesn't wipe out data we already received over the wire.
    useEffect(() => {
        if (!conversation || !turn || isGenerating) {
            return;
        }
        setToolCalls(extractToolCallsForPost(conversation, post.id));
        setAnnotations(extractAnnotationsFromTurn(turn));
        const reasoningText = extractReasoningFromTurn(turn).summary;
        setReasoning(reasoningText);
        setShowReasoning(reasoningText !== '');
        setApprovalStage(deriveApprovalStageForPost(conversation, post.id));
    }, [conversation, turn, post.id, isGenerating]);

    // Overlay streaming state as events arrive. Only mutate when the
    // streaming store actually produced a value so an empty new stream
    // doesn't wipe out persisted data. Clearing this local state on
    // restart is delegated to handleRegenerate; any future code path
    // that initialises a new stream must clear it explicitly too.
    useEffect(() => {
        if (!streamingState) {
            return;
        }
        if (streamingState.toolCalls.length > 0) {
            setToolCalls(streamingState.toolCalls);
        }
        if (streamingState.annotations.length > 0) {
            setAnnotations(streamingState.annotations);
        }
        if (streamingState.reasoning !== '') {
            setReasoning(streamingState.reasoning);
        }
        if (streamingState.showReasoning) {
            setShowReasoning(true);
        }
    }, [streamingState]);

    // Re-fetch the conversation when a stream finishes so the finalized turn
    // reaches the cache. POST_EDITED will clear the streamingState shortly
    // after; by then the local display state already has the latest values.
    const wasGeneratingRef = useRef(isGenerating);
    useEffect(() => {
        const wasGenerating = wasGeneratingRef.current;
        wasGeneratingRef.current = isGenerating;
        if (wasGenerating && !isGenerating) {
            invalidateConversation(serverUrl, conversationId);
        }
    }, [serverUrl, conversationId, isGenerating]);

    const displayMessage = streamingState?.message ?? post.message ?? '';

    const isRequester = currentUserId ? isConversationRequester({post, conversation, currentUserId}) : false;
    const canApprove = isRequester;
    const canExpand = isDM || isRequester;

    // The server already filtered per-user, so "has arguments" === "show
    // arguments". In DMs nothing is filtered.
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
        // Clear prior-response tool calls / reasoning / annotations so the
        // regenerated response starts from a clean slate rather than showing
        // the previous round's data until the new stream's events arrive.
        setToolCalls([]);
        setAnnotations([]);
        setReasoning('');
        setShowReasoning(false);
        setApprovalStage(ToolApprovalStage.Call);

        // Also clear the streaming store so the incoming 'start' event
        // doesn't preserve stale tool calls from the previous response.
        streamingStore.removePost(post.id);
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
