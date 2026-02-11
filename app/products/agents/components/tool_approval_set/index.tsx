// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {submitToolApproval} from '@agents/actions/remote/tool_approval';
import {submitToolResult} from '@agents/actions/remote/tool_result';
import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ToolCard from '../tool_card';

interface ToolApprovalSetProps {
    postId: string;
    toolCalls: ToolCall[];
    approvalStage: ToolApprovalStage | null;
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
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.64),
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
                return tool.status === ToolCallStatus.Success || tool.status === ToolCallStatus.Error;
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
        if (approvalStage === ToolApprovalStage.Result) {
            return toolCalls.filter((call) => call.status === ToolCallStatus.Success || call.status === ToolCallStatus.Error);
        }
        return toolCalls.filter((call) => call.status === ToolCallStatus.Pending);
    }, [toolCalls, approvalStage]);

    const submitDecisions = useCallback(async (decisions: ToolDecision) => {
        const approvedToolIds = Object.entries(decisions).
            filter(([, isApproved]) => isApproved).
            map(([id]) => id);

        setIsSubmitting(true);
        const submit = approvalStage === ToolApprovalStage.Result ? submitToolResult : submitToolApproval;
        const {error} = await submit(serverUrl, postId, approvedToolIds);

        // Reset submitting state regardless of success/error
        // On error, user can try again. On success, backend updates via POST_EDITED
        setIsSubmitting(false);

        if (error) {
            const barType = approvalStage === ToolApprovalStage.Result
                ? SNACK_BAR_TYPE.AGENT_TOOL_RESULT_ERROR
                : SNACK_BAR_TYPE.AGENT_TOOL_APPROVAL_ERROR;
            showSnackBar({barType});
        }

        return !error;
    }, [serverUrl, postId, approvalStage]);

    const handleToolDecision = useCallback(async (toolId: string, approved: boolean) => {
        if (isSubmitting) {
            return;
        }

        const updatedDecisions = {
            ...toolDecisions,
            [toolId]: approved,
        };
        setToolDecisions((prev) => ({...prev, [toolId]: approved}));

        // Check if there are still undecided actionable tools
        const hasUndecided = actionableTools.some((tool) => {
            return !(tool.id in updatedDecisions) || updatedDecisions[tool.id] === null;
        });

        if (!hasUndecided) {
            await submitDecisions(updatedDecisions);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toolDecisions is read for the submit check but setState uses functional form to avoid stale closure races
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

    if (toolCalls.length === 0) {
        return null;
    }

    const actionableIds = new Set(actionableTools.map((t) => t.id));
    const processedToolCalls = toolCalls.filter((call) => !actionableIds.has(call.id));

    // Calculate how many actionable tools haven't been decided yet
    const undecidedCount = actionableTools.filter(
        (tool) => !(tool.id in toolDecisions),
    ).length;

    // Helper to compute if a tool should be collapsed
    const isToolCollapsed = (tool: ToolCall) => {
        const defaultExpanded = actionableIds.has(tool.id);
        return !(expandedTools[tool.id] ?? defaultExpanded);
    };

    return (
        <View
            style={styles.container}
            testID='agents.tool_approval_set'
        >
            {actionableTools.map((tool) => (
                <ToolCard
                    key={tool.id}
                    tool={tool}
                    isCollapsed={isToolCollapsed(tool)}
                    isProcessing={isSubmitting}
                    localDecision={toolDecisions[tool.id]}
                    onToggleCollapse={toggleCollapse}
                    onApprove={canApprove ? handleApprove : undefined}
                    onReject={canApprove ? handleReject : undefined}
                    approvalStage={approvalStage}
                    canExpand={canExpand}
                    showArguments={showArguments}
                    showResults={showResults}
                />
            ))}

            {processedToolCalls.map((tool) => (
                <ToolCard
                    key={tool.id}
                    tool={tool}
                    isCollapsed={isToolCollapsed(tool)}
                    isProcessing={false}
                    onToggleCollapse={toggleCollapse}
                    onApprove={canApprove ? handleApprove : undefined}
                    onReject={canApprove ? handleReject : undefined}
                    approvalStage={approvalStage}
                    canExpand={canExpand}
                    showArguments={showArguments}
                    showResults={showResults}
                />
            ))}

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
