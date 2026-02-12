// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import {StyleSheet, View} from 'react-native';
import Animated from 'react-native-reanimated';

import type {ComponentProps} from 'react';

type Props = {
    isTranslating: boolean;
    backgroundColor: string;
    shimmerAnimatedStyle: ComponentProps<typeof Animated.View>['style'];
    gradientColors: ComponentProps<typeof LinearGradient>['colors'];
};

const shimmerStyles = StyleSheet.create({
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    shimmerBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    shimmerWrapper: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '300%',
    },
});

const gradientSettings = {
    locations: [0, 0.3, 0.5, 0.7, 1] as const,
    start: {x: 0, y: 0},
    end: {x: 0.766, y: 0.643}, // 130 degree angle (more severe)
};

const ShimmerAnimation = ({
    isTranslating,
    backgroundColor,
    shimmerAnimatedStyle,
    gradientColors,
}: Props) => {
    if (!isTranslating) {
        return null;
    }
    return (
        <View
            style={shimmerStyles.shimmerContainer}
            pointerEvents='none'
        >
            <View style={[shimmerStyles.shimmerBackground, {backgroundColor}]}/>
            <Animated.View style={[shimmerStyles.shimmerWrapper, shimmerAnimatedStyle]}>
                <LinearGradient
                    colors={gradientColors}
                    locations={gradientSettings.locations}
                    start={gradientSettings.start}
                    end={gradientSettings.end}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
};

export default ShimmerAnimation;
