// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ToolCallStatus, type ToolCall} from '@agents/types';
import React, {useMemo} from 'react';
import {ActivityIndicator, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ToolCardProps {
    tool: ToolCall;
    isCollapsed: boolean;
    isProcessing: boolean;
    localDecision?: boolean | null; // true = approved, false = rejected, null/undefined = undecided
    onToggleCollapse: () => void;
    onApprove?: () => void;
    onReject?: () => void;
}

/**
 * Individual tool card component showing tool details and approval buttons
 */
const ToolCard = ({
    tool,
    isCollapsed,
    isProcessing,
    localDecision,
    onToggleCollapse,
    onApprove,
    onReject,
}: ToolCardProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const isPending = tool.status === ToolCallStatus.Pending;
    const hasLocalDecision = localDecision !== undefined && localDecision !== null;
    const isAccepted = tool.status === ToolCallStatus.Accepted;
    const isSuccess = tool.status === ToolCallStatus.Success;
    const isError = tool.status === ToolCallStatus.Error;
    const isRejected = tool.status === ToolCallStatus.Rejected;

    // Convert underscores to spaces and capitalize first letter of each word
    const displayName = useMemo(() => {
        return tool.name.
            replace(/_/g, ' ').
            split(' ').
            map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
            join(' ');
    }, [tool.name]);

    // Render arguments as JSON code block
    const argumentsMarkdown = useMemo(() => {
        return `\`\`\`json\n${JSON.stringify(tool.arguments, null, 2)}\n\`\`\``;
    }, [tool.arguments]);

    // Render result as code block - try to detect if it's JSON
    const resultMarkdown = useMemo(() => {
        if (!tool.result) {
            return '';
        }

        try {
            JSON.parse(tool.result);
            return `\`\`\`json\n${tool.result}\n\`\`\``;
        } catch {
            return `\`\`\`\n${tool.result}\n\`\`\``;
        }
    }, [tool.result]);

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggleCollapse();
    };

    // Determine icon based on status
    const getStatusIcon = () => {
        if (isPending && !isProcessing) {
            return (
                <ActivityIndicator
                    size='small'
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    style={styles.statusIcon}
                />
            );
        }

        if (isAccepted || (isPending && isProcessing)) {
            return (
                <ActivityIndicator
                    size='small'
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    style={styles.statusIcon}
                />
            );
        }

        if (isSuccess) {
            return (
                <CompassIcon
                    name='check-circle'
                    size={12}
                    color={theme.onlineIndicator}
                    style={styles.statusIcon}
                />
            );
        }

        if (isError) {
            return (
                <CompassIcon
                    name='alert-circle-outline'
                    size={12}
                    color={theme.errorTextColor}
                    style={styles.statusIcon}
                />
            );
        }

        if (isRejected) {
            return (
                <CompassIcon
                    name='close-circle-outline'
                    size={12}
                    color={theme.dndIndicator}
                    style={styles.statusIcon}
                />
            );
        }

        return null;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={handleToggle}
                style={styles.header}
                activeOpacity={0.7}
            >
                <CompassIcon
                    name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                    size={16}
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                    style={styles.chevronIcon}
                />
                {getStatusIcon()}
                <Text
                    style={styles.toolName}
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
            </TouchableOpacity>

            {!isCollapsed && (
                <>
                    <View style={styles.argumentsContainer}>
                        <Markdown
                            baseTextStyle={styles.markdownText}
                            value={argumentsMarkdown}
                            theme={theme}
                            location={Screens.CHANNEL}
                        />
                    </View>

                    {(isSuccess || isError) && resultMarkdown && (
                        <>
                            <View style={styles.responseLabel}>
                                {isSuccess && (
                                    <CompassIcon
                                        name='check-circle'
                                        size={12}
                                        color={theme.onlineIndicator}
                                    />
                                )}
                                {isError && (
                                    <CompassIcon
                                        name='alert-circle-outline'
                                        size={12}
                                        color={theme.errorTextColor}
                                    />
                                )}
                                <FormattedText
                                    id='agents.tool_call.response'
                                    defaultMessage='Response'
                                    style={styles.responseLabelText}
                                />
                            </View>
                            <View style={styles.resultContainer}>
                                <Markdown
                                    baseTextStyle={styles.markdownText}
                                    value={resultMarkdown}
                                    theme={theme}
                                    location={Screens.CHANNEL}
                                />
                            </View>
                        </>
                    )}

                    {isRejected && (
                        <View style={styles.statusContainer}>
                            <CompassIcon
                                name='close-circle-outline'
                                size={12}
                                color={theme.dndIndicator}
                            />
                            <FormattedText
                                id='agents.tool_call.status.rejected'
                                defaultMessage='Rejected'
                                style={styles.statusText}
                            />
                        </View>
                    )}
                </>
            )}

            {isPending && !hasLocalDecision && isProcessing && (
                <View style={styles.statusContainer}>
                    <ActivityIndicator
                        size='small'
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <FormattedText
                        id='agents.tool_call.processing'
                        defaultMessage='Processing...'
                        style={styles.statusText}
                    />
                </View>
            )}

            {isPending && !hasLocalDecision && !isProcessing && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        onPress={onApprove}
                        disabled={isProcessing}
                        style={[styles.button, isProcessing && styles.buttonDisabled]}
                        activeOpacity={0.7}
                    >
                        <FormattedText
                            id='agents.tool_call.approve'
                            defaultMessage='Accept'
                            style={styles.buttonText}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onReject}
                        disabled={isProcessing}
                        style={[styles.button, isProcessing && styles.buttonDisabled]}
                        activeOpacity={0.7}
                    >
                        <FormattedText
                            id='agents.tool_call.reject'
                            defaultMessage='Reject'
                            style={styles.buttonText}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
        container: {
            marginBottom: 4,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 44, // Minimum touch target
            paddingVertical: 8,
        },
        chevronIcon: {
            width: 12,
        },
        statusIcon: {
            width: 12,
            height: 12,
        },
        toolName: {
            fontSize: 11,
            lineHeight: 20,
            color: changeOpacity(theme.centerChannelColor, 0.75),
            flex: 1,
        },
        argumentsContainer: {
            marginLeft: 24,
        },
        markdownText: {
            fontSize: 11,
            lineHeight: 16,
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        responseLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 8,
            paddingLeft: 24,
        },
        responseLabelText: {
            fontSize: 11,
            fontWeight: '600',
            lineHeight: 20,
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        resultContainer: {
            marginLeft: 24,
        },
        statusContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            paddingLeft: 24,
        },
        statusText: {
            fontSize: 11,
            lineHeight: 16,
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        buttonContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 4,
            paddingLeft: 24,
        },
        button: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
            paddingVertical: 4,
            paddingHorizontal: 10,
            height: 44, // Touch-optimized height
            justifyContent: 'center',
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        buttonText: {
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
            color: theme.buttonBg,
        },
    });
});

export default ToolCard;
