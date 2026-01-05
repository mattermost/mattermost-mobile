// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TOUCH_TARGET_SIZE} from '@agents/constants';
import React, {useCallback, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import LoadingSpinner from './loading_spinner';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        minimalContainer: {
            marginBottom: 4,
            minHeight: TOUCH_TARGET_SIZE,
        },
        minimalContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
        },
        minimalText: {
            fontSize: 14,
            lineHeight: 20,
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
            minHeight: TOUCH_TARGET_SIZE,
            paddingVertical: 12,
        },
        expandedHeaderText: {
            fontSize: 14,
            lineHeight: 20,
            color: changeOpacity(theme.centerChannelColor, 0.64),
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
    };
});

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
    const [isExpanded, setIsExpanded] = useState(false);
    const rotation = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

    const handleToggle = useCallback(() => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        rotation.value = withTiming(newExpanded ? 90 : 0, {duration: 200});
        contentOpacity.value = withTiming(newExpanded ? 1 : 0, {duration: 250});
    }, [isExpanded, rotation, contentOpacity]);

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${rotation.value}deg`}],
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    return (
        <View style={isExpanded ? styles.expandedContainer : styles.minimalContainer}>
            <TouchableOpacity
                onPress={handleToggle}
                style={isExpanded ? styles.expandedHeader : styles.minimalContent}
                activeOpacity={0.7}
            >
                <Animated.View style={chevronAnimatedStyle}>
                    <CompassIcon
                        name='chevron-right'
                        size={16}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </Animated.View>
                {isReasoningLoading && (
                    <LoadingSpinner/>
                )}
                <FormattedText
                    id='agents.reasoning.thinking'
                    defaultMessage='Thinking'
                    style={isExpanded ? styles.expandedHeaderText : styles.minimalText}
                />
            </TouchableOpacity>
            {isExpanded && reasoningSummary ? (
                <Animated.View style={[styles.reasoningContentContainer, contentAnimatedStyle]}>
                    <View style={styles.reasoningContent}>
                        <Text style={styles.reasoningText}>
                            {reasoningSummary}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}
        </View>
    );
};

export default ReasoningDisplay;
