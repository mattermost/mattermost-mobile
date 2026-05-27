// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';

import {submitToolApproval} from '@agents/actions/remote/tool_approval';
import {submitToolResult} from '@agents/actions/remote/tool_result';
import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

    // Reset decisions when approval stage transitions (e.g., Phase 1 → Phase 2)
    const prevStageRef = useRef(approvalStage);
    useEffect(() => {
        if (prevStageRef.current !== approvalStage) {
            prevStageRef.current = approvalStage;
            setToolDecisions({});
        }
    }, [approvalStage]);

    // Clear local decisions when tool status changes from actionable to something else
    useEffect(() => {
        const isActionable = (tool: ToolCall) => {
            if (approvalStage === ToolApprovalStage.Result) {
                return (
                    tool.status === ToolCallStatus.Success ||
                    tool.status === ToolCallStatus.Error ||
                    tool.status === ToolCallStatus.AutoApproved
                );
            }
            return tool.status === ToolCallStatus.Pending;
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

    const actionableTools = useMemo(() => {
        if (approvalStage === ToolApprovalStage.Call) {
            return toolCalls.filter((call) => call.status === ToolCallStatus.Pending);
        }
        if (approvalStage === ToolApprovalStage.Result) {
            return toolCalls.filter((call) =>
                call.status === ToolCallStatus.Success ||
                call.status === ToolCallStatus.Error ||
                call.status === ToolCallStatus.AutoApproved,
            );
        }

        // 'done' stage — server says no decision remains, render no buttons.
        return [];
    }, [toolCalls, approvalStage]);

    const submitDecisions = useCallback(async (decisions: ToolDecision) => {
        const approvedToolIds = Object.entries(decisions).
            filter(([, isApproved]) => isApproved).
            map(([id]) => id);

        setIsSubmitting(true);
        const submit = approvalStage === ToolApprovalStage.Result ? submitToolResult : submitToolApproval;
        const {error} = await submit(serverUrl, postId, approvedToolIds);

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

    const toggleCollapse = useCallback((toolId: string) => {
        const tool = toolCalls.find((t) => t.id === toolId);
        const isActionableTool = tool ? actionableTools.some((a) => a.id === tool.id) : false;
        setExpandedTools((prev) => ({
            ...prev,
            [toolId]: !(prev[toolId] ?? isActionableTool),
        }));
    }, [toolCalls, actionableTools]);

    const undecidedCount = useMemo(() => {
        return actionableTools.filter(
            (tool) => !(tool.id in toolDecisions),
        ).length;
    }, [actionableTools, toolDecisions]);

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
                const isActionable = actionableIds.has(tool.id);
                return (
                    <ToolCard
                        key={tool.id}
                        tool={tool}
                        isCollapsed={isToolCollapsed(tool)}
                        isProcessing={isActionable && isSubmitting}
                        localDecision={isActionable ? toolDecisions[tool.id] : undefined}
                        onToggleCollapse={toggleCollapse}
                        onApprove={isActionable && canApprove ? handleApprove : undefined}
                        onReject={isActionable && canApprove ? handleReject : undefined}
                        approvalStage={approvalStage}
                        canExpand={canExpand}
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
                        style={styles.statusText}
                    />
                </View>
            )}
        </View>
    );
};

export default ToolApprovalSet;
