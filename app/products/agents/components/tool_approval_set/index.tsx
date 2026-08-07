// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, View} from 'react-native';

import {submitToolApproval} from '@agents/actions/remote/tool_approval';
import {submitToolResult} from '@agents/actions/remote/tool_result';
import {ToolApprovalStage, ToolCallStatus, UserInteractionSelect, type ToolAnswer, type ToolCall} from '@agents/types';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import QuestionCard, {parseQuestionArgs} from '../question_card';
import ToolCard from '../tool_card';

interface ToolApprovalSetProps {
    postId: string;
    toolCalls: ToolCall[];
    approvalStage: ToolApprovalStage;
    canApprove: boolean;
    canExpand: boolean;
    showArguments: boolean;
    showResults: boolean;
}

type ToolDecision = {
    [toolId: string]: boolean | null; // true = approved, false = rejected, null = undecided
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 8,
            marginBottom: 12,
            marginLeft: -15,
            gap: 8,
        },
        statusBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            marginTop: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
        },
        statusText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        statusTextExpand: {
            flex: 1,
        },
        batchButtons: {
            flexDirection: 'row',
            gap: 8,
        },
        batchButton: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
            paddingVertical: 6,
            paddingHorizontal: 12,
        },
        batchButtonText: {
            color: theme.buttonBg,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

/**
 * Container component for displaying and managing tool approval requests
 */
const ToolApprovalSet = ({postId, toolCalls, approvalStage, canApprove, canExpand, showArguments, showResults}: ToolApprovalSetProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
    const [toolDecisions, setToolDecisions] = useState<ToolDecision>({});

    // Structured answers for accepted user-interaction tools, keyed by tool
    // call ID. Sent as tool_answers alongside accepted_tool_ids.
    const toolAnswersRef = useRef<Record<string, ToolAnswer>>({});

    // Reset decisions when approval stage transitions (e.g., Phase 1 → Phase 2)
    const prevStageRef = useRef(approvalStage);
    useEffect(() => {
        if (prevStageRef.current !== approvalStage) {
            prevStageRef.current = approvalStage;
            setToolDecisions({});
            toolAnswersRef.current = {};
        }
    }, [approvalStage]);

    // Clear local decisions when tool status changes from actionable to something else
    useEffect(() => {
        const isActionable = (tool: ToolCall) => {
            if (approvalStage === ToolApprovalStage.Result) {
                return (
                    !tool.decided_at &&
                    (tool.status === ToolCallStatus.Success ||
                    tool.status === ToolCallStatus.Error ||
                    tool.status === ToolCallStatus.AutoApproved)
                );
            }
            return tool.status === ToolCallStatus.Pending && !tool.would_auto_execute;
        };

        const filterActionableDecisions = (decisions: ToolDecision): ToolDecision => {
            const updated: ToolDecision = {};
            const prevToolIds = Object.keys(decisions);

            for (const toolId of prevToolIds) {
                const tool = toolCalls.find((t) => t.id === toolId);
                if (tool && isActionable(tool)) {
                    updated[toolId] = decisions[toolId];
                }
            }

            return updated;
        };

        setToolDecisions((prev) => {
            const updated = filterActionableDecisions(prev);
            const updatedCount = Object.keys(updated).length;
            const prevCount = Object.keys(prev).length;
            return updatedCount === prevCount ? prev : updated;
        });
    }, [toolCalls, approvalStage]);

    // An interrupted round where every pending call passed the auto-execution
    // policy: no per-tool decision exists, only a single "Run tools" resume.
    const isInterruptedAutoRound = useMemo(() => {
        if (approvalStage !== ToolApprovalStage.Call) {
            return false;
        }
        const pending = toolCalls.filter((call) => call.status === ToolCallStatus.Pending);
        return pending.length > 0 && pending.every((call) => call.would_auto_execute);
    }, [toolCalls, approvalStage]);

    const actionableTools = useMemo(() => {
        // Non-requesters can view but not act, so nothing is actionable for
        // them — this collapses the per-card decision buttons AND the multi-tool
        // status/batch bar below.
        if (!canApprove) {
            return [];
        }
        if (approvalStage === ToolApprovalStage.Call) {
            // Calls that passed the auto-execution policy run server-side once
            // the rest of the batch is resolved — no decision needed, and
            // Reject would be a lying control (the server executes anyway).
            return toolCalls.filter((call) => call.status === ToolCallStatus.Pending && !call.would_auto_execute);
        }
        if (approvalStage === ToolApprovalStage.Result) {
            // Results whose share/keep-private decision is already recorded
            // (decided_at set) must not be re-prompted, and user-interaction
            // results were authored by the user at answer time.
            return toolCalls.filter((call) =>
                !call.user_interaction &&
                !call.decided_at &&
                (call.status === ToolCallStatus.Success ||
                call.status === ToolCallStatus.Error ||
                call.status === ToolCallStatus.AutoApproved),
            );
        }

        // 'done' stage — server says no decision remains, render no buttons.
        return [];
    }, [toolCalls, approvalStage, canApprove]);

    const submitDecisions = useCallback(async (decisions: ToolDecision) => {
        const approvedToolIds = Object.entries(decisions).
            filter(([, isApproved]) => isApproved).
            map(([id]) => id);

        setIsSubmitting(true);
        let error: unknown;
        if (approvalStage === ToolApprovalStage.Result) {
            ({error} = await submitToolResult(serverUrl, postId, approvedToolIds));
        } else {
            // Include structured answers for the accepted user-interaction
            // calls (AskUserQuestion) so the server can resolve them.
            const answers: Record<string, ToolAnswer> = {};
            for (const id of approvedToolIds) {
                if (toolAnswersRef.current[id]) {
                    answers[id] = toolAnswersRef.current[id];
                }
            }
            ({error} = await submitToolApproval(serverUrl, postId, approvedToolIds, answers));
        }

        setIsSubmitting(false);

        if (error) {
            const barType = approvalStage === ToolApprovalStage.Result? SNACK_BAR_TYPE.AGENT_TOOL_RESULT_ERROR: SNACK_BAR_TYPE.AGENT_TOOL_APPROVAL_ERROR;
            showSnackBar({barType});
        }

        return !error;
    }, [serverUrl, postId, approvalStage]);

    const handleToolDecision = useCallback(async (toolId: string, approved: boolean) => {
        if (isSubmitting) {
            return;
        }

        // Capture the latest decisions via the functional setter so two rapid
        // taps each see the previous tap's choice rather than a stale snapshot.
        let updatedDecisions: ToolDecision = {};
        setToolDecisions((prev) => {
            updatedDecisions = {...prev, [toolId]: approved};
            return updatedDecisions;
        });

        const hasUndecided = actionableTools.some((tool) => {
            return !(tool.id in updatedDecisions) || updatedDecisions[tool.id] === null;
        });

        if (!hasUndecided) {
            await submitDecisions(updatedDecisions);
        }
    }, [isSubmitting, actionableTools, submitDecisions]);

    const handleApprove = useCallback((toolId: string) => {
        handleToolDecision(toolId, true);
    }, [handleToolDecision]);

    const handleReject = useCallback((toolId: string) => {
        handleToolDecision(toolId, false);
    }, [handleToolDecision]);

    // Record the structured answer for a question, then treat it as an
    // approval decision so the batch submits once everything is decided.
    const handleQuestionAnswer = useCallback((toolId: string, selected: string[], custom: string) => {
        toolAnswersRef.current = {
            ...toolAnswersRef.current,
            [toolId]: custom ? {selected, custom} : {selected},
        };
        handleToolDecision(toolId, true);
    }, [handleToolDecision]);

    // Batch decide every actionable approval tool in one tap. Questions
    // cannot be batch-decided — an answer (or explicit skip) is required per
    // question — so with questions still undecided the batch is recorded and
    // submission waits for them.
    const handleBatchDecision = useCallback(async (approved: boolean) => {
        if (isSubmitting) {
            return;
        }
        let decisions: ToolDecision = {};
        setToolDecisions((prev) => {
            decisions = {...prev};
            for (const tool of actionableTools) {
                if (approvalStage === ToolApprovalStage.Call && tool.user_interaction) {
                    continue;
                }
                decisions[tool.id] = approved;
            }
            return decisions;
        });

        const hasUndecided = actionableTools.some((tool) => !(tool.id in decisions));
        if (hasUndecided) {
            return;
        }
        await submitDecisions(decisions);
    }, [isSubmitting, actionableTools, approvalStage, submitDecisions]);

    const handleAcceptAll = usePreventDoubleTap(useCallback(() => handleBatchDecision(true), [handleBatchDecision]));
    const handleRejectAll = usePreventDoubleTap(useCallback(() => handleBatchDecision(false), [handleBatchDecision]));

    // Resume an interrupted all-auto round: submit with no accepted ids; the
    // server re-checks the auto-execution policy and runs the tools itself.
    const handleRunTools = usePreventDoubleTap(useCallback(async () => {
        if (isSubmitting) {
            return;
        }
        await submitDecisions({});
    }, [isSubmitting, submitDecisions]));

    const toggleCollapse = useCallback((toolId: string) => {
        const tool = toolCalls.find((t) => t.id === toolId);
        const isActionableTool = tool ? actionableTools.some((a) => a.id === tool.id) : false;
        setExpandedTools((prev) => ({
            ...prev,
            [toolId]: !(prev[toolId] ?? isActionableTool),
        }));
    }, [toolCalls, actionableTools]);

    // The "N tools need decisions" bar and batch buttons only make sense for
    // approval-type decisions; questions are self-describing cards that must
    // be answered (or skipped) individually.
    const approvalActionableTools = useMemo(() => {
        return actionableTools.filter((tool) => !tool.user_interaction);
    }, [actionableTools]);

    const undecidedCount = useMemo(() => {
        return approvalActionableTools.filter(
            (tool) => !(tool.id in toolDecisions),
        ).length;
    }, [approvalActionableTools, toolDecisions]);

    if (toolCalls.length === 0) {
        return null;
    }

    const actionableIds = new Set(actionableTools.map((t) => t.id));
    const isCallStage = approvalStage === ToolApprovalStage.Call;
    const isResultStage = approvalStage === ToolApprovalStage.Result;

    const isToolCollapsed = (tool: ToolCall) => {
        // Auto-approved tools default collapsed; the user never interacted with them.
        if (tool.status === ToolCallStatus.AutoApproved) {
            return !(expandedTools[tool.id] ?? false);
        }

        let defaultExpanded = false;
        if (isCallStage) {
            defaultExpanded = tool.status === ToolCallStatus.Pending;
        } else if (isResultStage) {
            defaultExpanded = tool.status === ToolCallStatus.Success || tool.status === ToolCallStatus.Error;
        }
        return !(expandedTools[tool.id] ?? defaultExpanded);
    };

    return (
        <View
            style={styles.container}
            testID='agents.tool_approval_set'
        >
            {toolCalls.map((tool) => {
                // In a mixed approval batch, policy-approved calls stay hidden
                // until the user's decisions let the server run them. Live
                // calls and interrupted all-auto rounds remain visible.
                if (tool.status === ToolCallStatus.Pending &&
                    tool.would_auto_execute &&
                    isCallStage &&
                    !isInterruptedAutoRound) {
                    return null;
                }
                const isActionable = actionableIds.has(tool.id);

                if (tool.user_interaction === UserInteractionSelect) {
                    // Redacted calls (non-requesters) have no arguments to
                    // render; fall through to the generic tool card.
                    const question = parseQuestionArgs(tool.arguments);
                    if (question) {
                        return (
                            <QuestionCard
                                key={tool.id}
                                tool={tool}
                                question={question}
                                isProcessing={isActionable && isSubmitting}
                                localDecision={isActionable ? toolDecisions[tool.id] : undefined}
                                canAnswer={isActionable && isCallStage}
                                onAnswer={isActionable ? handleQuestionAnswer : undefined}
                                onSkip={isActionable ? handleReject : undefined}
                            />
                        );
                    }
                }

                return (
                    <ToolCard
                        key={tool.id}
                        tool={tool}
                        isCollapsed={isToolCollapsed(tool)}
                        isProcessing={isActionable && isSubmitting}
                        localDecision={isActionable ? toolDecisions[tool.id] : undefined}
                        onToggleCollapse={toggleCollapse}
                        onApprove={isActionable ? handleApprove : undefined}
                        onReject={isActionable ? handleReject : undefined}
                        approvalStage={approvalStage}
                        canExpand={canExpand}
                        canApprove={canApprove}
                        showArguments={showArguments}
                        showResults={showResults}
                        isAutoApproved={tool.status === ToolCallStatus.AutoApproved}
                    />
                );
            })}

            {actionableTools.length > 1 && isSubmitting && (
                <View
                    style={styles.statusBar}
                    testID='agents.tool_approval_set.submitting'
                >
                    <Loading
                        size='small'
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <FormattedText
                        id='agents.tool_call.submitting'
                        defaultMessage='Submitting...'
                        style={styles.statusText}
                    />
                </View>
            )}

            {actionableTools.length > 1 && undecidedCount > 0 && !isSubmitting && (
                <View
                    style={styles.statusBar}
                    testID='agents.tool_approval_set.pending_decisions'
                >
                    <FormattedText
                        id='agents.tool_call.pending_decisions'
                        defaultMessage='{count, plural, =0 {All tools decided} one {# tool needs a decision} other {# tools need decisions}}'
                        values={{count: undecidedCount}}
                        style={[styles.statusText, styles.statusTextExpand]}
                    />
                    <View style={styles.batchButtons}>
                        <Pressable
                            onPress={handleAcceptAll}
                            style={({pressed}) => [styles.batchButton, pressed && {opacity: 0.72}]}
                            testID='agents.tool_approval_set.accept_all'
                        >
                            <FormattedText
                                id='agents.tool_call.accept_all'
                                defaultMessage='Accept all'
                                style={styles.batchButtonText}
                            />
                        </Pressable>
                        <Pressable
                            onPress={handleRejectAll}
                            style={({pressed}) => [styles.batchButton, pressed && {opacity: 0.72}]}
                            testID='agents.tool_approval_set.reject_all'
                        >
                            <FormattedText
                                id='agents.tool_call.reject_all'
                                defaultMessage='Reject all'
                                style={styles.batchButtonText}
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {isInterruptedAutoRound && canApprove && (
                <View
                    style={styles.statusBar}
                    testID='agents.tool_approval_set.run_tools_bar'
                >
                    {isSubmitting ? (
                        <>
                            <Loading
                                size='small'
                                color={changeOpacity(theme.centerChannelColor, 0.64)}
                            />
                            <FormattedText
                                id='agents.tool_call.submitting'
                                defaultMessage='Submitting...'
                                style={styles.statusText}
                            />
                        </>
                    ) : (
                        <Pressable
                            onPress={handleRunTools}
                            style={({pressed}) => [styles.batchButton, pressed && {opacity: 0.72}]}
                            testID='agents.tool_approval_set.run_tools'
                        >
                            <FormattedText
                                id='agents.tool_call.run_tools'
                                defaultMessage='Run tools'
                                style={styles.batchButtonText}
                            />
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
};

export default ToolApprovalSet;
