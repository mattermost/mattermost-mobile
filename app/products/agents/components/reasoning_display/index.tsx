// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {TOUCH_TARGET_SIZE} from '@agents/constants';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import LoadingSpinner from './loading_spinner';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        minimalContainer: {
            marginBottom: 4,
            minHeight: TOUCH_TARGET_SIZE,
            marginLeft: -14,
        },
        minimalContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 12,
        },
        minimalText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 100),
        },
        expandedContainer: {
            marginBottom: 16,
            marginLeft: -15,
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
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 100),
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
            color: changeOpacity(theme.centerChannelColor, 0.8),
            ...typography('Body', 100),
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
            <Pressable
                onPress={handleToggle}
                style={({pressed}) => [isExpanded ? styles.expandedHeader : styles.minimalContent, pressed && {opacity: 0.72}]}
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
            </Pressable>
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
