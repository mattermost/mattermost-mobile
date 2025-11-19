// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {submitToolApproval} from '@agents/actions/remote/tool_approval';
import {type ToolCall, ToolCallStatus} from '@agents/types';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import FormattedText from '@components/formatted_text';
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

/**
 * Container component for displaying and managing tool approval requests
 */
const ToolApprovalSet = ({postId, toolCalls}: ToolApprovalSetProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [collapsedTools, setCollapsedTools] = useState<string[]>([]);
    const [toolDecisions, setToolDecisions] = useState<ToolDecision>({});

    // Clear local decisions when tool status changes from Pending to something else
    useEffect(() => {
        const shouldClearDecision = (toolId: string) => {
            const tool = toolCalls.find((t) => t.id === toolId);
            return tool && tool.status !== ToolCallStatus.Pending;
        };

        setToolDecisions((prev) => {
            const decisionsToRemove = Object.keys(prev).filter(shouldClearDecision);

            if (decisionsToRemove.length === 0) {
                return prev; // No changes needed
            }

            const updated = {...prev};
            decisionsToRemove.forEach((toolId) => {
                delete updated[toolId];
            });
            return updated;
        });
    }, [toolCalls]);

    const handleToolDecision = async (toolId: string, approved: boolean) => {
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

        if (hasUndecided) {
            // If there are still undecided tools, do not submit yet
            return;
        }

        // Submit when all tools are decided
        const approvedToolIds = Object.entries(updatedDecisions).
            filter(([, isApproved]) => isApproved).
            map(([id]) => id);

        setIsSubmitting(true);
        const {error} = await submitToolApproval(serverUrl, postId, approvedToolIds);

        if (error) {
            // Reset on error so user can try again
            setIsSubmitting(false);
        } else {
            // Backend will execute tools and update the post via POST_EDITED event
            // The component will receive updated toolCalls prop and useEffect will clear local decisions
            setIsSubmitting(false);
        }
    };

    const toggleCollapse = (toolId: string) => {
        setCollapsedTools((prev) =>
            (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]),
        );
    };

    if (toolCalls.length === 0) {
        return null;
    }

    // Get pending tool calls
    const pendingToolCalls = toolCalls.filter((call) => call.status === ToolCallStatus.Pending);

    // Get processed tool calls
    const processedToolCalls = toolCalls.filter((call) => call.status !== ToolCallStatus.Pending);

    // Calculate how many tools are left to decide on
    const undecidedCount = Object.values(toolDecisions).filter((decision) => decision === null).length;

    // Helper to compute if a tool should be collapsed
    const isToolCollapsed = (tool: ToolCall) => {
        // Pending tools are expanded by default, others are collapsed
        const defaultExpanded = tool.status === ToolCallStatus.Pending;

        // Check if user has toggled this tool
        const isCollapsed = collapsedTools.includes(tool.id);

        // If default is expanded, being in the list means user collapsed it
        // If default is collapsed, being in the list means user expanded it
        return defaultExpanded ? isCollapsed : !isCollapsed;
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
                    onToggleCollapse={() => toggleCollapse(tool.id)}
                    onApprove={() => handleToolDecision(tool.id, true)}
                    onReject={() => handleToolDecision(tool.id, false)}
                />
            ))}

            {processedToolCalls.map((tool) => (
                <ToolCard
                    key={tool.id}
                    tool={tool}
                    isCollapsed={isToolCollapsed(tool)}
                    isProcessing={false}
                    onToggleCollapse={() => toggleCollapse(tool.id)}
                />
            ))}

            {/* Only show status bar for multiple pending tools */}
            {pendingToolCalls.length > 1 && isSubmitting && (
                <View style={styles.statusBar}>
                    <ActivityIndicator
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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
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
    });
});

export default ToolApprovalSet;
