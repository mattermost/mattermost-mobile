// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import LoadingSpinner from './loading_spinner';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ReasoningDisplayProps {
    reasoningSummary: string;
    isReasoningLoading: boolean;
}

/**
 * Display component for agent reasoning summaries
 * Shows collapsible section with reasoning text and loading state
 */
const ReasoningDisplay = ({reasoningSummary, isReasoningLoading}: ReasoningDisplayProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [isCollapsed, setIsCollapsed] = useState(true);

    const handleToggle = () => {
        // Animate the layout change
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsCollapsed(!isCollapsed);
    };

    if (isCollapsed) {
        return (
            <TouchableOpacity
                onPress={handleToggle}
                style={styles.minimalContainer}
                activeOpacity={0.7}
            >
                <View style={styles.minimalContent}>
                    <CompassIcon
                        name='chevron-right'
                        size={16}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                        style={styles.chevronCollapsed}
                    />
                    {isReasoningLoading && (
                        <LoadingSpinner/>
                    )}
                    <FormattedText
                        id='agents.reasoning.thinking'
                        defaultMessage='Thinking'
                        style={styles.minimalText}
                    />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.expandedContainer}>
            <TouchableOpacity
                onPress={handleToggle}
                style={styles.expandedHeader}
                activeOpacity={0.7}
            >
                <CompassIcon
                    name='chevron-right'
                    size={16}
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    style={styles.chevronExpanded}
                />
                {isReasoningLoading && (
                    <LoadingSpinner/>
                )}
                <FormattedText
                    id='agents.reasoning.thinking'
                    defaultMessage='Thinking'
                    style={styles.expandedHeaderText}
                />
            </TouchableOpacity>
            {reasoningSummary ? (
                <View style={styles.reasoningContentContainer}>
                    <View style={styles.reasoningContent}>
                        <Text style={styles.reasoningText}>
                            {reasoningSummary}
                        </Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
        minimalContainer: {
            marginBottom: 4,
            minHeight: 44, // Minimum touch target
        },
        minimalContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
        },
        minimalText: {
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        expandedContainer: {
            marginBottom: 16,
        },
        expandedHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            minHeight: 44, // Minimum touch target
            paddingVertical: 12,
        },
        expandedHeaderText: {
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        chevronCollapsed: {
            transform: [{rotate: '0deg'}],
        },
        chevronExpanded: {
            transform: [{rotate: '90deg'}],
        },
        reasoningContentContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.02),
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 8,
            overflow: 'hidden',
        },
        reasoningContent: {
            maxHeight: 600,
        },
        reasoningText: {
            padding: 16,
            fontSize: 14,
            lineHeight: 22,
            color: changeOpacity(theme.centerChannelColor, 0.8),
        },
    });
});

export default ReasoningDisplay;
