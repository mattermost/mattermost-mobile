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

import QuestionCard from '../question_card';
import {parseQuestionArgs} from '../question_card/utils';
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

// A tool requires an explicit user decision in the given stage. Calls that
// passed the auto-execution policy run server-side once the rest of the batch
// is resolved, and results that are user-authored (user_interaction) or
// already decided (decided_at recorded server-side) need no share decision.
function isDecisionTool(tool: ToolCall, approvalStage: ToolApprovalStage): boolean {
    if (approvalStage === ToolApprovalStage.Call) {
        return tool.status === ToolCallStatus.Pending && !tool.would_auto_execute;
    }
    if (approvalStage === ToolApprovalStage.Result) {
        return !tool.user_interaction &&
            !tool.decided &&
            (tool.status === ToolCallStatus.Success ||
                tool.status === ToolCallStatus.Error ||
                tool.status === ToolCallStatus.AutoApproved);
    }

    // 'done' stage — server says no decision remains, render no buttons.
    return false;
}

// Default expansion for a card the user has not toggled yet. Pending tools
// (call stage) expand so users see what they are asked to approve; executed
// tools (result stage) expand so the output is visible during the share
// decision. Auto-approved tools always default collapsed — the user never
// interacted with them.
function isDefaultExpanded(tool: ToolCall, approvalStage: ToolApprovalStage): boolean {
    if (tool.status === ToolCallStatus.AutoApproved) {
        return false;
    }
    if (approvalStage === ToolApprovalStage.Call) {
        return tool.status === ToolCallStatus.Pending;
    }
    if (approvalStage === ToolApprovalStage.Result) {
        return tool.status === ToolCallStatus.Success || tool.status === ToolCallStatus.Error;
    }
    return false;
}

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

    // Structured answers for accepted user-interaction tools (questions),
    // keyed by tool call ID. Sent as tool_answers alongside accepted_tool_ids.
    const toolAnswersRef = useRef<{[toolId: string]: ToolAnswer}>({});

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
        const filterActionableDecisions = (decisions: ToolDecision): ToolDecision => {
            const updated: ToolDecision = {};
            const prevToolIds = Object.keys(decisions);

            for (const toolId of prevToolIds) {
                const tool = toolCalls.find((t) => t.id === toolId);
                if (tool && isDecisionTool(tool, approvalStage)) {
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

    const actionableTools = useMemo(() => {
        // Non-requesters can view but not act, so nothing is actionable for
        // them — this collapses the per-card decision buttons AND the multi-tool
        // status/batch bar below.
        if (!canApprove) {
            return [];
        }
        return toolCalls.filter((call) => isDecisionTool(call, approvalStage));
    }, [toolCalls, approvalStage, canApprove]);

    // An interrupted round consisting only of policy-approved calls (e.g. the
    // stream died before they ran). The user is never offered per-tool
    // decisions for those; a single "Run tools" action resumes the round and
    // the server re-checks the auto-execution policy before running them.
    const isInterruptedAutoRound = useMemo(() => {
        if (approvalStage !== ToolApprovalStage.Call) {
            return false;
        }
        const pendingToolCalls = toolCalls.filter((call) => call.status === ToolCallStatus.Pending);
        return pendingToolCalls.length > 0 && pendingToolCalls.every((call) => call.would_auto_execute);
    }, [toolCalls, approvalStage]);

    const submitDecisions = useCallback(async (decisions: ToolDecision) => {
        const approvedToolIds = Object.entries(decisions).
            filter(([, isApproved]) => isApproved).
            map(([id]) => id);

        setIsSubmitting(true);
        let error: unknown;
        if (approvalStage === ToolApprovalStage.Result) {
            ({error} = await submitToolResult(serverUrl, postId, approvedToolIds));
        } else {
            // Attach the stored answers for accepted questions only; rejected
            // (skipped) questions must not carry an answer.
            const answers: {[toolId: string]: ToolAnswer} = {};
            for (const id of approvedToolIds) {
                if (toolAnswersRef.current[id]) {
                    answers[id] = toolAnswersRef.current[id];
                }
            }
            const hasAnswers = Object.keys(answers).length > 0;
            ({error} = await submitToolApproval(serverUrl, postId, approvedToolIds, hasAnswers ? answers : undefined));
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

    // Store the structured answer for a question, then route it through the
    // regular decision flow so it batches with the round's other decisions
    // (matches the webapp: submission happens once nothing remains undecided).
    const handleQuestionAnswer = useCallback((toolId: string, selections: string[], custom: string) => {
        toolAnswersRef.current = {
            ...toolAnswersRef.current,
            [toolId]: custom ? {selected: selections, custom} : {selected: selections},
        };
        handleToolDecision(toolId, true);
    }, [handleToolDecision]);

    // Batch decide every actionable tool in one tap. Questions cannot be
    // batch-decided — an answer (or explicit skip) is required per question —
    // so submission waits until the remaining questions are answered/skipped.
    const handleBatchDecision = useCallback(async (approved: boolean) => {
        if (isSubmitting) {
            return;
        }
        let updatedDecisions: ToolDecision = {};
        setToolDecisions((prev) => {
            updatedDecisions = {...prev};
            for (const tool of actionableTools) {
                if (approvalStage === ToolApprovalStage.Call && tool.user_interaction) {
                    continue;
                }
                updatedDecisions[tool.id] = approved;
            }
            return updatedDecisions;
        });

        const hasUndecided = actionableTools.some((tool) => {
            return !(tool.id in updatedDecisions) || updatedDecisions[tool.id] === null;
        });

        if (!hasUndecided) {
            await submitDecisions(updatedDecisions);
        }
    }, [isSubmitting, actionableTools, approvalStage, submitDecisions]);

    const handleAcceptAll = usePreventDoubleTap(useCallback(() => handleBatchDecision(true), [handleBatchDecision]));
    const handleRejectAll = usePreventDoubleTap(useCallback(() => handleBatchDecision(false), [handleBatchDecision]));

    // Resume an interrupted all-auto round. Submits an empty accepted list —
    // the server executes the policy-approved calls itself after re-checking
    // the auto-execution policy (matches the webapp's Run tools submission).
    const handleRunTools = usePreventDoubleTap(useCallback(() => {
        if (isSubmitting) {
            return;
        }
        submitDecisions({});
    }, [isSubmitting, submitDecisions]));

    const toggleCollapse = useCallback((toolId: string) => {
        const tool = toolCalls.find((t) => t.id === toolId);
        const defaultExpanded = tool ? isDefaultExpanded(tool, approvalStage) : false;
        setExpandedTools((prev) => ({
            ...prev,
            [toolId]: !(prev[toolId] ?? defaultExpanded),
        }));
    }, [toolCalls, approvalStage]);

    // The "N tools need decisions" bar and batch buttons only make sense for
    // approval-type decisions; questions are self-describing cards that must
    // be answered (or skipped) individually.
    const approvalDecisionTools = useMemo(() => {
        return actionableTools.filter((tool) => !tool.user_interaction);
    }, [actionableTools]);

    const undecidedCount = useMemo(() => {
        return approvalDecisionTools.filter(
            (tool) => !(tool.id in toolDecisions),
        ).length;
    }, [approvalDecisionTools, toolDecisions]);

    if (toolCalls.length === 0) {
        return null;
    }

    const actionableIds = new Set(actionableTools.map((t) => t.id));
    const isCallStage = approvalStage === ToolApprovalStage.Call;

    const isToolCollapsed = (tool: ToolCall) => {
        return !(expandedTools[tool.id] ?? isDefaultExpanded(tool, approvalStage));
    };

    return (
        <View
            style={styles.container}
            testID='agents.tool_approval_set'
        >
            {toolCalls.map((tool) => {
                const isActionable = actionableIds.has(tool.id);

                // In a mixed approval batch, policy-approved calls stay hidden
                // until the user's decisions let the server run them. Live
                // calls and interrupted all-auto rounds remain visible.
                if (tool.status === ToolCallStatus.Pending &&
                    tool.would_auto_execute &&
                    isCallStage &&
                    !isInterruptedAutoRound) {
                    return null;
                }

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
                        isProcessing={(isActionable || isInterruptedAutoRound) && isSubmitting}
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

            {approvalDecisionTools.length > 1 && isSubmitting && (
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

            {approvalDecisionTools.length > 1 && undecidedCount > 0 && !isSubmitting && (
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
