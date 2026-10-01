// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';

import {cancelConversationFetch, refetchConversation} from '@agents/actions/remote/conversation';
import {useGenerationControls} from '@agents/hooks/use_generation_controls';
import {isConversationRequester} from '@agents/requester';
import {useAgentsConfig} from '@agents/store/agents_config';
import {useConversation} from '@agents/store/conversation_store';
import {useStreamingState} from '@agents/store/streaming_store';
import {
    anyToolHasArguments,
    anyToolHasResult,
    buildRoundsFromTurns,
    deriveApprovalStageForPost,
    stripOpenAICitations,
} from '@agents/turn_content';
import {ToolApprovalStage, ToolCallStatus, type Annotation, type ConversationResponse, type Round} from '@agents/types';
import {isUnsafeLinksPost} from '@agents/utils';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CitationsList from '../citations_list';
import ControlsBar from '../controls_bar';
import ReasoningDisplay from '../reasoning_display';
import ServerToolSet from '../server_tool_set';
import ToolApprovalSet from '../tool_approval_set';

import StreamingIndicator from './streaming_indicator';
import WorkingIndicator from './working_indicator';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

// Sentinel id for the in-progress streaming round; persisted rounds use turn ids.
const LIVE_ROUND_ID = 'live';
const POST_MESSAGE_ROUND_ID = 'post-message';

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
    conversationId: string;
    location: AvailableScreens;
    isDM: boolean;
    approvalStage: ToolApprovalStage;
    canApprove: boolean;
    canExpand: boolean;
    showCursor: boolean;
    isReasoningLoading: boolean;
    isFirst: boolean;
    unsafeLinks: boolean;
}

// Renders one assistant round as a vertical sequence reasoning -> provider
// activity -> text -> tools, reproducing the true interleaving of a
// multi-step agent response.
const RoundView = memo(({
    round,
    postId,
    conversationId,
    location,
    isDM,
    approvalStage,
    canApprove,
    canExpand,
    showCursor,
    isReasoningLoading,
    isFirst,
    unsafeLinks,
}: RoundViewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // The server filters per-user already, so non-DMs hide tools whose
    // arguments/results were redacted for this viewer.
    const showArguments = isDM || anyToolHasArguments(round.toolCalls);
    const showResults = isDM || anyToolHasResult(round.toolCalls);

    // Applies to both streaming (live/snapshotted) and persisted rounds since
    // every agent round renders through this component.
    const text = useMemo(() => stripOpenAICitations(round.text), [round.text]);

    return (
        <View style={isFirst ? undefined : styles.roundSpacing}>
            {round.reasoning.summary !== '' && (
                <ReasoningDisplay
                    reasoningSummary={round.reasoning.summary}
                    isReasoningLoading={isReasoningLoading}
                />
            )}
            {round.serverTools.length > 0 && (
                <ServerToolSet serverTools={round.serverTools}/>
            )}
            {text !== '' && (
                <View style={styles.messageContainer}>
                    <Markdown
                        baseTextStyle={styles.messageText}
                        value={text}
                        theme={theme}
                        location={location}
                        isUnsafeLinksPost={unsafeLinks}
                    />
                    {showCursor && (
                        <StreamingIndicator/>
                    )}
                </View>
            )}
            {round.toolCalls.length > 0 && (
                <ToolApprovalSet
                    postId={postId}
                    conversationId={conversationId}
                    toolCalls={round.toolCalls}
                    approvalStage={approvalStage}
                    canApprove={canApprove}
                    canExpand={canExpand}
                    showArguments={showArguments}
                    showResults={showResults}
                    unsafeLinks={unsafeLinks}
                />
            )}
        </View>
    );
});
RoundView.displayName = 'RoundView';

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

    const {allowUnsafeLinks} = useAgentsConfig(serverUrl);
    const unsafeLinks = isUnsafeLinksPost(post, allowUnsafeLinks);

    const {conversation, loading: conversationLoading, error: conversationError} = useConversation(serverUrl, conversationId);

    const streamingState = useStreamingState(serverUrl, post.id);
    const isGenerating = streamingState?.generating ?? false;
    const isPrecontent = streamingState?.precontent ?? false;
    const isReasoningLoading = streamingState?.isReasoningLoading ?? false;
    const isGenerationInProgress = isGenerating || isReasoningLoading;

    // Suppresses the stale persisted rounds while a regenerate is in flight —
    // the server deletes the prior response turns as soon as regeneration
    // starts, but the cached conversation still holds them until the
    // stream-end refetch lands. Mirrors the webapp's `regenerating` state.
    const [regenerating, setRegenerating] = useState(false);

    // Conversation object captured when regenerate was tapped; any different
    // object afterwards is a fresh fetch of the regenerated turns.
    const regenBaselineRef = useRef<ConversationResponse | undefined>(undefined);
    const conversationRef = useRef(conversation);
    conversationRef.current = conversation;

    // Persisted rounds derived from the conversation turns (the server truth).
    const persistedRounds = useMemo(
        () => (conversation ? buildRoundsFromTurns(conversation, post.id) : []),
        [conversation, post.id],
    );

    // The in-progress round assembled from the live streaming buffers.
    const liveRound = useMemo<Round | null>(() => {
        if (!streamingState) {
            return null;
        }
        const {message, toolCalls, reasoning, annotations, serverTools} = streamingState;
        if (message === '' && toolCalls.length === 0 && reasoning === '' && annotations.length === 0 && serverTools.length === 0) {
            return null;
        }
        return {
            id: LIVE_ROUND_ID,
            text: message,
            toolCalls,
            reasoning: {summary: reasoning, signature: ''},
            annotations,
            serverTools,
        };
    }, [streamingState]);

    // Stack the persisted prefix (prior rounds, e.g. after a tool-approval
    // continue) + snapshotted rounds + the live round for as long as streaming
    // state exists. The websocket handler drops that state in the same update
    // that delivers the post-stream refetch, so content never blinks out or
    // renders twice.
    const {renderedRounds, lastPersistedIdx} = useMemo(() => {
        // While regenerating, the cached persisted rounds are the prior answer
        // the server has already deleted — hide them so the old response never
        // stacks above the new stream (webapp computeRenderedRounds parity).
        const visiblePersisted = regenerating ? [] : persistedRounds;
        const out = [...visiblePersisted];
        if (streamingState) {
            out.push(...streamingState.rounds);
            if (liveRound) {
                out.push(liveRound);
            }
        }

        // Webapp currentRound parity: until the cached conversation holds this
        // response's turns (e.g. the stream-end event was missed), render the
        // persisted post message rather than a blank body. Skipped on a cold
        // open so the loading placeholder shows until the first fetch lands.
        const coldOpen = conversationLoading && !conversation;
        if (out.length === 0 && !isGenerationInProgress && !regenerating && !coldOpen && post.message !== '') {
            out.push({
                id: POST_MESSAGE_ROUND_ID,
                text: post.message,
                toolCalls: [],
                reasoning: {summary: '', signature: ''},
                annotations: [],
                serverTools: [],
            });
        }
        return {renderedRounds: out, lastPersistedIdx: visiblePersisted.length - 1};
    }, [isGenerationInProgress, streamingState, liveRound, persistedRounds, regenerating, conversationLoading, conversation, post.message]);

    // ensureConversation never refreshes a cached entry, so a cache fetched
    // before this response's turns were persisted stays stale whenever the
    // stream-end refetch is missed (websocket down, app backgrounded). Refetch
    // once per post revision when a finished post has text but no turns.
    const staleRefetchRevisionRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        // While streaming state exists the websocket handler owns the refetch.
        if (!conversation || conversationLoading || conversationError || streamingState || regenerating) {
            return;
        }
        if (post.message === '' || persistedRounds.length > 0 || staleRefetchRevisionRef.current === post.updateAt) {
            return;
        }
        staleRefetchRevisionRef.current = post.updateAt;
        refetchConversation(serverUrl, conversationId);
    }, [conversation, conversationLoading, conversationError, streamingState, regenerating, post.message, post.updateAt, persistedRounds.length, serverUrl, conversationId]);

    // The stream-end refetch is owned by the websocket handler
    // (handleAgentPostUpdate). A tool-approval `continue` resume bumps
    // continueSeq; refetch so the just-resolved prior round (now persisted
    // server-side) appears above the resumed live round.
    const continueSeq = streamingState?.continueSeq ?? 0;
    const lastContinueSeqRef = useRef(continueSeq);
    useEffect(() => {
        if (continueSeq > lastContinueSeqRef.current) {
            lastContinueSeqRef.current = continueSeq;
            refetchConversation(serverUrl, conversationId);
        } else if (continueSeq < lastContinueSeqRef.current) {
            // Streaming state was cleared (continueSeq reset to 0); realign the
            // ref so a later continue in a fresh stream triggers a refetch again.
            lastContinueSeqRef.current = continueSeq;
        }
    }, [serverUrl, conversationId, continueSeq]);

    // Lift the regenerate suppression once a fresh conversation object lands
    // (the post-stream refetch delivering the regenerated turns — the
    // websocket handler refetches on both `end` and `cancel`).
    // Also lift it when a refetch fails after the stream settled so the post
    // falls back to whatever it has instead of staying blank. Webapp parity:
    // llmbot_post clears `regenerating` in its pendingRefetch layout-effect
    // and on the `cancel` control event.
    useEffect(() => {
        if (!regenerating) {
            return;
        }
        if (conversation !== regenBaselineRef.current) {
            setRegenerating(false);
        } else if (conversationError && !conversationLoading && !isGenerationInProgress) {
            setRegenerating(false);
        }
    }, [regenerating, conversation, conversationError, conversationLoading, isGenerationInProgress]);

    const isRequester = isConversationRequester({post, conversation, currentUserId});
    const canApprove = isRequester;
    const canExpand = isRequester;

    // Only the anchor round gets a real approval stage: the last persisted
    // round when nothing follows it, or a live round with calls awaiting the
    // requester, so Accept shows before the post-stream refetch lands (webapp
    // livePendingForRequester parity). Snapshotted rounds render as 'done'.
    const lastRenderedIdx = renderedRounds.length - 1;
    const lastRendered = renderedRounds[lastRenderedIdx];
    const livePendingForRequester = isRequester && lastRendered?.id === LIVE_ROUND_ID &&
        lastRendered.toolCalls.some((call) => call.status === ToolCallStatus.Pending && !call.would_auto_execute);
    const persistedAnchorStage = conversation ? deriveApprovalStageForPost(conversation, post.id) : ToolApprovalStage.Done;
    const getRoundStage = (idx: number) => {
        if (idx !== lastRenderedIdx) {
            return ToolApprovalStage.Done;
        }
        if (livePendingForRequester) {
            return ToolApprovalStage.Call;
        }
        return idx === lastPersistedIdx ? persistedAnchorStage : ToolApprovalStage.Done;
    };

    // Combined Sources list at the bottom, aggregated across rounds. Dedupe only
    // by non-empty url; citations without a url can't be meaningfully deduped and
    // are all kept (matches the legacy renderer + CitationsList, which key on index).
    const annotations = useMemo<Annotation[]>(() => {
        const seen = new Set<string>();
        const all: Annotation[] = [];
        for (const round of renderedRounds) {
            for (const annotation of round.annotations) {
                if (annotation.url) {
                    if (seen.has(annotation.url)) {
                        continue;
                    }
                    seen.add(annotation.url);
                }
                all.push(annotation);
            }
        }
        return all;
    }, [renderedRounds]);

    const noRegenProp = (post.props as Record<string, unknown>)?.no_regen;
    const noRegen = noRegenProp === true || noRegenProp === 'true';
    const hasContent = renderedRounds.length > 0;
    const showStopButton = isGenerationInProgress && isRequester;
    const showRegenerateButton = !isGenerationInProgress && isRequester && hasContent && isDM && !noRegen;
    const showCursorOnLive = isGenerating && !isPrecontent && !isReasoningLoading;

    // Beyond the streaming precontent phase, show the placeholder when there is
    // nothing else to render: while the plugin prepares a response it created
    // empty (web parity: precontent starts as post.message === ''), on a cold
    // open while the conversation fetch is in flight, and right after a
    // regenerate tap before the new stream's `start` event arrives.
    const showLoadError = Boolean(conversationError) && !isGenerating && !conversationLoading;
    const showPlaceholder = isPrecontent ||
        (!hasContent && !showLoadError && (post.message === '' || regenerating || (conversationLoading && !isGenerating)));

    const beforeRegenerate = useCallback(() => {
        // Suppress the stale persisted rounds. A fetch still in flight (e.g.
        // the previous stream's end refetch) would carry the old answer and
        // lift the suppression; discard it.
        cancelConversationFetch(serverUrl, conversationId);
        regenBaselineRef.current = conversationRef.current;
        setRegenerating(true);
    }, [serverUrl, conversationId]);
    const onRegenerateError = useCallback(() => setRegenerating(false), []);
    const {stop: handleStop, regenerate: handleRegenerate} = useGenerationControls(post.id, {beforeRegenerate, onRegenerateError});

    return (
        <View style={styles.container}>
            {showLoadError ? (
                <FormattedText
                    id='agents.conversation.load_error'
                    defaultMessage='Failed to load conversation data'
                    style={styles.precontentText}
                />
            ) : null}
            {renderedRounds.map((round, idx) => {
                const isLive = round.id === LIVE_ROUND_ID;
                return (
                    <RoundView
                        key={round.id}
                        round={round}
                        postId={post.id}
                        conversationId={conversationId}
                        location={location}
                        isDM={isDM}
                        approvalStage={getRoundStage(idx)}
                        canApprove={canApprove}
                        canExpand={canExpand}
                        showCursor={isLive && showCursorOnLive}
                        isReasoningLoading={isLive && isReasoningLoading}
                        isFirst={idx === 0}
                        unsafeLinks={unsafeLinks}
                    />
                );
            })}
            {showPlaceholder && (
                <WorkingIndicator progressPhase={streamingState?.progressPhase}/>
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
