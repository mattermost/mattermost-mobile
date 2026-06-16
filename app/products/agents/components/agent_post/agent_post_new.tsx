// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';

import {refetchConversation} from '@agents/actions/remote/conversation';
import {regenerateResponse, stopGeneration} from '@agents/actions/remote/generation_controls';
import {isConversationRequester} from '@agents/requester';
import {useConversation} from '@agents/store/conversation_store';
import streamingStore, {useStreamingState} from '@agents/store/streaming_store';
import {
    anyToolHasArguments,
    anyToolHasResult,
    buildRoundsFromTurns,
    deriveApprovalStageForPost,
} from '@agents/turn_content';
import {ToolApprovalStage, type Annotation, type Round} from '@agents/types';
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

// Sentinel id for the in-progress streaming round; persisted rounds use turn ids.
const LIVE_ROUND_ID = 'live';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        roundSpacing: {
            marginTop: 8,
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

interface RoundViewProps {
    round: Round;
    postId: string;
    location: AvailableScreens;
    isDM: boolean;
    approvalStage: ToolApprovalStage;
    canApprove: boolean;
    canExpand: boolean;
    showCursor: boolean;
    isReasoningLoading: boolean;
    isReasoningExpanded: boolean;
    isFirst: boolean;
    onToggleReasoning: (roundId: string, expanded: boolean) => void;
}

// Renders one assistant round as a vertical sequence reasoning -> text -> tools,
// reproducing the true text/tool interleaving of a multi-step agent response.
const RoundView = ({
    round,
    postId,
    location,
    isDM,
    approvalStage,
    canApprove,
    canExpand,
    showCursor,
    isReasoningLoading,
    isReasoningExpanded,
    isFirst,
    onToggleReasoning,
}: RoundViewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // The server filters per-user already, so non-DMs hide tools whose
    // arguments/results were redacted for this viewer.
    const showArguments = isDM || anyToolHasArguments(round.toolCalls);
    const showResults = isDM || anyToolHasResult(round.toolCalls);

    const handleToggleReasoning = useCallback((expanded: boolean) => {
        onToggleReasoning(round.id, expanded);
    }, [onToggleReasoning, round.id]);

    return (
        <View style={isFirst ? undefined : styles.roundSpacing}>
            {round.reasoning.summary !== '' && (
                <ReasoningDisplay
                    reasoningSummary={round.reasoning.summary}
                    isReasoningLoading={isReasoningLoading}
                    isExpanded={isReasoningExpanded}
                    onToggle={handleToggleReasoning}
                />
            )}
            {round.text !== '' && (
                <View style={styles.messageContainer}>
                    <Markdown
                        baseTextStyle={styles.messageText}
                        value={round.text}
                        theme={theme}
                        location={location}
                    />
                    {showCursor && (
                        <StreamingIndicator/>
                    )}
                </View>
            )}
            {round.toolCalls.length > 0 && (
                <ToolApprovalSet
                    postId={postId}
                    toolCalls={round.toolCalls}
                    approvalStage={approvalStage}
                    canApprove={canApprove}
                    canExpand={canExpand}
                    showArguments={showArguments}
                    showResults={showResults}
                />
            )}
        </View>
    );
};

export interface AgentPostNewProps {
    post: PostModel;
    conversationId: string;
    currentUserId?: string;
    location: AvailableScreens;
    isDM: boolean;
}

const AgentPostNew = ({post, conversationId, currentUserId, location, isDM}: AgentPostNewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const {conversation, loading: conversationLoading, error: conversationError} = useConversation(serverUrl, conversationId);

    const streamingState = useStreamingState(serverUrl, post.id);
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;
    const isGenerationInProgress = isGenerating || isReasoningLoading;

    // Persisted rounds derived from the conversation turns (the server truth).
    const persistedRounds = useMemo(
        () => (conversation ? buildRoundsFromTurns(conversation, post.id) : []),
        [conversation, post.id],
    );

    // Keep the last persisted rounds visible through the brief refetch gap when
    // the cached conversation is momentarily unavailable.
    const lastPersistedRef = useRef<Round[]>([]);
    useEffect(() => {
        if (conversation) {
            lastPersistedRef.current = persistedRounds;
        }
    }, [conversation, persistedRounds]);
    const stablePersisted = conversation ? persistedRounds : lastPersistedRef.current;

    // The in-progress round assembled from the live streaming buffers.
    const liveRound = useMemo<Round | null>(() => {
        if (!streamingState) {
            return null;
        }
        const {message, toolCalls, reasoning, annotations} = streamingState;
        if (message === '' && toolCalls.length === 0 && reasoning === '' && annotations.length === 0) {
            return null;
        }
        return {
            id: LIVE_ROUND_ID,
            text: message,
            toolCalls,
            reasoning: {summary: reasoning, signature: ''},
            annotations,
        };
    }, [streamingState]);

    // While streaming, stack the persisted prefix (prior rounds, e.g. after a
    // tool-approval continue) + snapshotted rounds + the live round. Once the
    // stream settles, the refetched conversation becomes the source of truth;
    // until it reflects this response, keep streamed rounds visible so content
    // doesn't blink out during the refetch gap.
    const {renderedRounds, lastPersistedIdx} = useMemo(() => {
        const storeRounds = streamingState?.rounds ?? [];
        if (isGenerationInProgress) {
            const out = [...stablePersisted, ...storeRounds];
            if (liveRound) {
                out.push(liveRound);
            }
            return {renderedRounds: out, lastPersistedIdx: stablePersisted.length - 1};
        }
        if (persistedRounds.length > 0) {
            return {renderedRounds: persistedRounds, lastPersistedIdx: persistedRounds.length - 1};
        }
        const out = liveRound ? [...storeRounds, liveRound] : [...storeRounds];
        return {renderedRounds: out, lastPersistedIdx: -1};
    }, [isGenerationInProgress, stablePersisted, streamingState, liveRound, persistedRounds]);

    // Invalidate the cached conversation when a stream finishes so the next
    // fetch surfaces the finalised turns.
    const wasGeneratingRef = useRef(isGenerating);
    useEffect(() => {
        const wasGenerating = wasGeneratingRef.current;
        wasGeneratingRef.current = isGenerating;
        if (wasGenerating && !isGenerating) {
            refetchConversation(serverUrl, conversationId);
        }
    }, [serverUrl, conversationId, isGenerating]);

    // A tool-approval `continue` resume bumps continueSeq; refetch so the
    // just-resolved prior round (now persisted server-side) appears above the
    // resumed live round. Safe to fire alongside the stream-end refetch above —
    // refetchConversation dedupes in-flight requests.
    const continueSeq = streamingState?.continueSeq ?? 0;
    const lastContinueSeqRef = useRef(continueSeq);
    useEffect(() => {
        if (continueSeq > lastContinueSeqRef.current) {
            lastContinueSeqRef.current = continueSeq;
            refetchConversation(serverUrl, conversationId);
        }
    }, [serverUrl, conversationId, continueSeq]);

    // Once a finished stream's refetch has populated the persisted rounds, drop
    // the streaming store entry so the snapshotted rounds aren't rendered twice
    // (POST_EDITED also clears it; this guards the refetch-before-POST_EDITED gap).
    useEffect(() => {
        if (streamingState && !isGenerationInProgress && persistedRounds.length > 0) {
            streamingStore.removePost(serverUrl, post.id);
        }
    }, [streamingState, isGenerationInProgress, persistedRounds.length, serverUrl, post.id]);

    const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
    const handleToggleReasoning = useCallback((roundId: string, expanded: boolean) => {
        setExpandedReasoning((prev) => ({...prev, [roundId]: expanded}));
    }, []);

    const isRequester = isConversationRequester({post, conversation, currentUserId});
    const canApprove = isRequester;
    const canExpand = isRequester;

    // Only the post anchor (last persisted round, when it is also the last
    // rendered round) gets a real approval stage; live/snapshotted rounds always
    // render as 'done'.
    const anchorStage = conversation ? deriveApprovalStageForPost(conversation, post.id) : ToolApprovalStage.Done;
    const lastRenderedIdx = renderedRounds.length - 1;

    // Combined Sources list at the bottom, aggregated across rounds (deduped by url).
    const annotations = useMemo<Annotation[]>(() => {
        const seen = new Set<string>();
        const all: Annotation[] = [];
        for (const round of renderedRounds) {
            for (const annotation of round.annotations) {
                if (!seen.has(annotation.url)) {
                    seen.add(annotation.url);
                    all.push(annotation);
                }
            }
        }
        return all;
    }, [renderedRounds]);

    const noRegen = Boolean((post.props as Record<string, unknown>)?.no_regen);
    const hasContent = renderedRounds.length > 0;
    const showStopButton = isGenerationInProgress && isRequester;
    const showRegenerateButton = !isGenerationInProgress && isRequester && hasContent && isDM && !noRegen;
    const showCursorOnLive = isGenerating && !isPrecontent;

    const handleStop = useCallback(async () => {
        // Mark stopped first so late `next` events are ignored before the
        // server's cancel/end lands.
        streamingStore.markStopped(serverUrl, post.id);
        const {error} = await stopGeneration(serverUrl, post.id);
        if (error) {
            showSnackBar({barType: SNACK_BAR_TYPE.AGENT_STOP_ERROR});
        }
    }, [serverUrl, post.id]);

    const handleRegenerate = useCallback(async () => {
        // Clear the streaming store so the new stream starts from a clean slate
        // instead of showing the previous round's data.
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
            {renderedRounds.map((round, idx) => {
                const isLive = round.id === LIVE_ROUND_ID;
                const stage = (idx === lastPersistedIdx && idx === lastRenderedIdx) ? anchorStage : ToolApprovalStage.Done;
                return (
                    <RoundView
                        key={round.id}
                        round={round}
                        postId={post.id}
                        location={location}
                        isDM={isDM}
                        approvalStage={stage}
                        canApprove={canApprove}
                        canExpand={canExpand}
                        showCursor={isLive && showCursorOnLive}
                        isReasoningLoading={isLive && isReasoningLoading}
                        isReasoningExpanded={Boolean(expandedReasoning[round.id])}
                        isFirst={idx === 0}
                        onToggleReasoning={handleToggleReasoning}
                    />
                );
            })}
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
