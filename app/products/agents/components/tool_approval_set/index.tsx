// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {submitToolApproval} from '@agents/actions/remote/tool_approval';
import {type ToolCall, ToolCallStatus} from '@agents/types';
import React, {useCallback, useEffect, useState} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ToolCard from '../tool_card';

interface ToolApprovalSetProps {
    postId: string;
    toolCalls: ToolCall[];
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
const ToolApprovalSet = ({postId, toolCalls}: ToolApprovalSetProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
    const [toolDecisions, setToolDecisions] = useState<ToolDecision>({});

    // Clear local decisions when tool status changes from Pending to something else
    useEffect(() => {
        // Keep only decisions for tools that are still pending
        const filterPendingDecisions = (decisions: ToolDecision): ToolDecision => {
            const updated: ToolDecision = {};
            const prevToolIds = Object.keys(decisions);

            for (const toolId of prevToolIds) {
                const tool = toolCalls.find((t) => t.id === toolId);
                if (tool && tool.status === ToolCallStatus.Pending) {
                    updated[toolId] = decisions[toolId];
                }
            }

            return updated;
        };

        setToolDecisions((prev) => {
            const updated = filterPendingDecisions(prev);
            const updatedCount = Object.keys(updated).length;
            const prevCount = Object.keys(prev).length;
            return updatedCount === prevCount ? prev : updated;
        });
    }, [toolCalls]);

    const submitDecisions = useCallback(async (decisions: ToolDecision) => {
        const approvedToolIds = Object.entries(decisions).
            filter(([, isApproved]) => isApproved).
            map(([id]) => id);

        setIsSubmitting(true);
        const {error} = await submitToolApproval(serverUrl, postId, approvedToolIds);

        // Reset submitting state regardless of success/error
        // On error, user can try again. On success, backend updates via POST_EDITED
        setIsSubmitting(false);
        return !error;
    }, [serverUrl, postId]);

    const handleToolDecision = useCallback(async (toolId: string, approved: boolean) => {
        if (isSubmitting) {
            return;
        }

        const updatedDecisions = {
            ...toolDecisions,
            [toolId]: approved,
        };
        setToolDecisions(updatedDecisions);

        // Check if there are still undecided tools
        const hasUndecided = toolCalls.some((tool) => {
            return !(tool.id in updatedDecisions) || updatedDecisions[tool.id] === null;
        });

        if (!hasUndecided) {
            await submitDecisions(updatedDecisions);
        }
    }, [isSubmitting, toolDecisions, toolCalls, submitDecisions]);

    const handleApprove = useCallback((toolId: string) => {
        handleToolDecision(toolId, true);
    }, [handleToolDecision]);

    const handleReject = useCallback((toolId: string) => {
        handleToolDecision(toolId, false);
    }, [handleToolDecision]);

    const toggleCollapse = useCallback((toolId: string) => {
        const tool = toolCalls.find((t) => t.id === toolId);
        const defaultExpanded = tool?.status === ToolCallStatus.Pending;
        setExpandedTools((prev) => ({
            ...prev,
            [toolId]: !(prev[toolId] ?? defaultExpanded),
        }));
    }, [toolCalls]);

    if (toolCalls.length === 0) {
        return null;
    }

    // Get pending tool calls
    const pendingToolCalls = toolCalls.filter((call) => call.status === ToolCallStatus.Pending);

    // Get processed tool calls
    const processedToolCalls = toolCalls.filter((call) => call.status !== ToolCallStatus.Pending);

    // Calculate how many pending tools haven't been decided yet
    const undecidedCount = pendingToolCalls.filter(
        (tool) => !(tool.id in toolDecisions),
    ).length;

    // Helper to compute if a tool should be collapsed
    const isToolCollapsed = (tool: ToolCall) => {
        const defaultExpanded = tool.status === ToolCallStatus.Pending;
        return !(expandedTools[tool.id] ?? defaultExpanded);
    };

    return (
        <View style={styles.container}>
            {pendingToolCalls.map((tool) => (
                <ToolCard
                    key={tool.id}
                    tool={tool}
                    isCollapsed={isToolCollapsed(tool)}
                    isProcessing={isSubmitting}
                    localDecision={toolDecisions[tool.id]}
                    onToggleCollapse={toggleCollapse}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            ))}

            {processedToolCalls.map((tool) => (
                <ToolCard
                    key={tool.id}
                    tool={tool}
                    isCollapsed={isToolCollapsed(tool)}
                    isProcessing={false}
                    onToggleCollapse={toggleCollapse}
                />
            ))}

            {/* Only show status bar for multiple pending tools */}
            {pendingToolCalls.length > 1 && isSubmitting && (
                <View style={styles.statusBar}>
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

            {/* Only show status counter for multiple pending tools that haven't been submitted yet */}
            {pendingToolCalls.length > 1 && undecidedCount > 0 && !isSubmitting && (
                <View style={styles.statusBar}>
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
