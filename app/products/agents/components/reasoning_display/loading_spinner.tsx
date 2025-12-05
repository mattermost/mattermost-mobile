// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: 14,
        height: 14,
    },
    spinner: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderStyle: 'solid',
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));

/**
 * Animated loading spinner for reasoning generation
 * Shows a rotating circular indicator
 */
const LoadingSpinner = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, {duration: 1000, easing: Easing.linear}),
            -1,
        );

        return () => {
            cancelAnimation(rotation);
        };
    }, [rotation]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${rotation.value}deg`}],
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.spinner, animatedStyle]}/>
        </View>
    );
};

export default LoadingSpinner;
