// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';
import React, {useCallback, useEffect, useMemo} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {safeParseJSON} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

interface ToolCardProps {
    tool: ToolCall;
    isCollapsed: boolean;
    isProcessing: boolean;
    localDecision?: boolean | null; // true = approved, false = rejected, null/undefined = undecided
    onToggleCollapse: (toolId: string) => void;
    onApprove?: (toolId: string) => void;
    onReject?: (toolId: string) => void;
    approvalStage: ToolApprovalStage | null;
    canExpand?: boolean;
    showArguments?: boolean;
    showResults?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginBottom: 4,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
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
            color: changeOpacity(theme.centerChannelColor, 0.75),
            flex: 1,
            ...typography('Body', 100),
        },
        argumentsContainer: {
            marginLeft: 24,
        },
        markdownText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 50),
        },
        responseLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 24,
        },
        responseLabelText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 100),
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
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 100),
        },
        buttonContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 4,
            paddingLeft: 36,
        },
        resultButtonContainer: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 12,
            marginLeft: 24,
        },
        button: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            justifyContent: 'center',
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        buttonText: {
            color: theme.buttonBg,
            ...typography('Body', 75, 'SemiBold'),
        },
        shareButton: {
            backgroundColor: theme.buttonBg,
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
        },
        shareButtonText: {
            color: theme.buttonColor,
            ...typography('Body', 75, 'SemiBold'),
        },
        keepPrivateButton: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
        },
        keepPrivateButtonText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 75, 'SemiBold'),
        },
        warningCallout: {
            backgroundColor: changeOpacity(theme.dndIndicator, 0.08),
            borderLeftWidth: 3,
            borderLeftColor: theme.dndIndicator,
            borderRadius: 4,
            padding: 12,
            marginTop: 8,
            marginLeft: 24,
            gap: 4,
        },
        warningHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        warningHeaderText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        warningBodyText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Body', 75),
        },
    };
});

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
    approvalStage,
    canExpand = true,
    showArguments = true,
    showResults = true,
}: ToolCardProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const contentOpacity = useSharedValue(isCollapsed ? 0 : 1);
    const chevronRotation = useSharedValue(isCollapsed ? 0 : 90);

    useEffect(() => {
        contentOpacity.value = isCollapsed ? 0 : 1;
        chevronRotation.value = isCollapsed ? 0 : 90;
    }, [isCollapsed, contentOpacity, chevronRotation]);

    const isPending = tool.status === ToolCallStatus.Pending;
    const hasLocalDecision = localDecision !== undefined && localDecision !== null;
    const isSuccess = tool.status === ToolCallStatus.Success;
    const isError = tool.status === ToolCallStatus.Error;
    const isRejected = tool.status === ToolCallStatus.Rejected;
    const isResultPhase = approvalStage === ToolApprovalStage.Result;

    // Convert underscores to spaces and capitalize first letter of each word
    const displayName = useMemo(() => {
        return tool.name.
            replace(/_/g, ' ').
            replace(/\b\w/g, (char) => char.toUpperCase());
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

        const parsed = safeParseJSON(tool.result);
        if (typeof parsed === 'object' && parsed !== null) {
            return `\`\`\`json\n${tool.result}\n\`\`\``;
        }
        return `\`\`\`\n${tool.result}\n\`\`\``;
    }, [tool.result]);

    const handleToggle = useCallback(() => {
        if (!canExpand) {
            return;
        }
        const newCollapsed = !isCollapsed;
        contentOpacity.value = withTiming(newCollapsed ? 0 : 1, {duration: 200});
        chevronRotation.value = withTiming(newCollapsed ? 0 : 90, {duration: 200});
        onToggleCollapse(tool.id);
    }, [canExpand, isCollapsed, contentOpacity, chevronRotation, onToggleCollapse, tool.id]);

    const handleApprove = usePreventDoubleTap(useCallback(() => {
        onApprove?.(tool.id);
    }, [onApprove, tool.id]));

    const handleReject = usePreventDoubleTap(useCallback(() => {
        onReject?.(tool.id);
    }, [onReject, tool.id]));

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${chevronRotation.value}deg`}],
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    // Determine icon based on status
    const getStatusIcon = () => {
        if (isPending) {
            return (
                <Loading
                    size='small'
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    containerStyle={styles.statusIcon}
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

    const testIdPrefix = `agents.tool_card.${tool.id}`;

    return (
        <View
            style={styles.container}
            testID={testIdPrefix}
        >
            <TouchableOpacity
                onPress={canExpand ? handleToggle : undefined}
                style={styles.header}
                activeOpacity={canExpand ? 0.7 : 1}
                testID={`${testIdPrefix}.header`}
            >
                {canExpand ? (
                    <Animated.View style={[styles.chevronIcon, chevronAnimatedStyle]}>
                        <CompassIcon
                            name='chevron-right'
                            size={16}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                        />
                    </Animated.View>
                ) : null}
                {getStatusIcon()}
                <Text
                    style={styles.toolName}
                    numberOfLines={1}
                    testID={`${testIdPrefix}.name`}
                >
                    {displayName}
                </Text>
            </TouchableOpacity>

            {!isCollapsed && (
                <Animated.View style={contentAnimatedStyle}>
                    {showArguments && (
                        <View
                            style={styles.argumentsContainer}
                            testID={`${testIdPrefix}.arguments`}
                        >
                            <Markdown
                                baseTextStyle={styles.markdownText}
                                value={argumentsMarkdown}
                                theme={theme}
                                location={Screens.CHANNEL}
                            />
                        </View>
                    )}

                    {showResults && (isSuccess || isError) && resultMarkdown && (
                        <>
                            <View
                                style={styles.responseLabel}
                                testID={`${testIdPrefix}.result`}
                            >
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
                            {isResultPhase && (
                                <View
                                    style={styles.warningCallout}
                                    testID={`${testIdPrefix}.warning`}
                                >
                                    <View style={styles.warningHeader}>
                                        <CompassIcon
                                            name='information-outline'
                                            size={14}
                                            color={theme.dndIndicator}
                                        />
                                        <FormattedText
                                            id='agents.tool_call.review_tool_response'
                                            defaultMessage='Review tool response'
                                            style={styles.warningHeaderText}
                                        />
                                    </View>
                                    <FormattedText
                                        id='agents.tool_call.approval_warning'
                                        defaultMessage='Approving lets Agents use this response in their next message. That message will be visible to everyone in the channel — only approve results you are comfortable sharing.'
                                        style={styles.warningBodyText}
                                    />
                                </View>
                            )}
                        </>
                    )}

                    {isRejected && (
                        <View
                            style={styles.statusContainer}
                            testID={`${testIdPrefix}.status.rejected`}
                        >
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
                </Animated.View>
            )}

            {isPending && !hasLocalDecision && isProcessing && (
                <View
                    style={styles.statusContainer}
                    testID={`${testIdPrefix}.status.processing`}
                >
                    <Loading
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

            {isPending && !hasLocalDecision && !isProcessing && onApprove && onReject && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        onPress={handleApprove}
                        disabled={isProcessing}
                        style={[styles.button, isProcessing && styles.buttonDisabled]}
                        activeOpacity={0.7}
                        testID={`${testIdPrefix}.approve`}
                    >
                        <FormattedText
                            id='agents.tool_call.approve'
                            defaultMessage='Accept'
                            style={styles.buttonText}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleReject}
                        disabled={isProcessing}
                        style={[styles.button, isProcessing && styles.buttonDisabled]}
                        activeOpacity={0.7}
                        testID={`${testIdPrefix}.reject`}
                    >
                        <FormattedText
                            id='agents.tool_call.reject'
                            defaultMessage='Reject'
                            style={styles.buttonText}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {isResultPhase && (isSuccess || isError) && !hasLocalDecision && !isProcessing && onApprove && onReject && (
                <View style={styles.resultButtonContainer}>
                    <TouchableOpacity
                        onPress={handleApprove}
                        disabled={isProcessing}
                        style={[styles.shareButton, isProcessing && styles.buttonDisabled]}
                        activeOpacity={0.7}
                        testID={`${testIdPrefix}.share`}
                    >
                        <CompassIcon
                            name='globe'
                            size={14}
                            color={theme.buttonColor}
                        />
                        <FormattedText
                            id='agents.tool_call.share'
                            defaultMessage='Share'
                            style={styles.shareButtonText}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleReject}
                        disabled={isProcessing}
                        style={[styles.keepPrivateButton, isProcessing && styles.buttonDisabled]}
                        activeOpacity={0.7}
                        testID={`${testIdPrefix}.keep_private`}
                    >
                        <CompassIcon
                            name='lock-outline'
                            size={14}
                            color={changeOpacity(theme.centerChannelColor, 0.75)}
                        />
                        <FormattedText
                            id='agents.tool_call.keep_private'
                            defaultMessage='Keep private'
                            style={styles.keepPrivateButtonText}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default ToolCard;
