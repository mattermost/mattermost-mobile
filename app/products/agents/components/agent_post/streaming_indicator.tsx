// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        minHeight: 20,
    },
    cursor: {
        width: 2,
        height: 16,
        borderRadius: 1,
        marginLeft: 2,
        backgroundColor: theme.centerChannelColor,
    },
}));

/**
 * Animated indicator shown while agent is generating a response
 * Shows a pulsing cursor for mobile-optimized UX
 */
const StreamingIndicator = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, {duration: 800}),
                withTiming(0.3, {duration: 800}),
            ),
            -1,
        );

        return () => {
            cancelAnimation(opacity);
        };
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.cursor, animatedStyle]}/>
        </View>
    );
};

export default StreamingIndicator;
