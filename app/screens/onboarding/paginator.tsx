// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, useWindowDimensions, TouchableOpacity} from 'react-native';
import Animated, {interpolate, useAnimatedStyle} from 'react-native-reanimated';

import {makeStyleSheetFromTheme} from '@utils/theme';

import {OnboardingItem} from './slides_data';

type Props = {
    data: OnboardingItem[];
    theme: Theme;
    scrollX: Animated.SharedValue<number>;
    moveToSlide: (slideIndexToMove: number) => void;
};

const DOT_SIZE = 16;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    dot: {
        height: DOT_SIZE / 2,
        borderRadius: 5,
        backgroundColor: theme.buttonBg,
        marginHorizontal: DOT_SIZE / 2,
        width: DOT_SIZE / 2,
        opacity: 0.25,
    },
    fixedDot: {
        height: DOT_SIZE / 2,
        borderRadius: 5,
        backgroundColor: theme.buttonBg,
        marginHorizontal: DOT_SIZE / 2,
        width: DOT_SIZE / 2,
        opacity: 0.25,
        position: 'absolute',
    },
    outerDot: {
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: theme.buttonBg,
        marginHorizontal: 4,
        marginTop: -4,
        position: 'absolute',
        width: DOT_SIZE,
        opacity: 0.15,
    },
}));

const Paginator = ({
    theme,
    data,
    scrollX,
    moveToSlide,
}: Props) => {
    return (
        <View style={{flexDirection: 'row', height: 15}}>
            {data.map((item: OnboardingItem, index: number) => {
                return (
                    <Dot
                        key={`${item.id}-${index.toString()}`}
                        theme={theme}
                        moveToSlide={moveToSlide}
                        index={index}
                        scrollX={scrollX}
                    />
                );
            })}
        </View>
    );
};

type DotProps = {
    index: number;
    scrollX: Animated.SharedValue<number>;
    theme: Theme;
    moveToSlide: (slideIndexToMove: number) => void;
};

// this has to be extracted as a component since the useAnimatedStyle hook cant be used inside a loop
const Dot = ({index, scrollX, theme, moveToSlide}: DotProps) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const dotOpacity = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0, 1, 0],
        );

        return {opacity};
    });

    const outerDotOpacity = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0, 0.15, 0],
        );

        return {opacity};
    });

    return (
        <TouchableOpacity
            onPress={() => moveToSlide(index)}
        >
            <Animated.View
                style={[styles.fixedDot]}
            />
            <Animated.View
                style={[styles.outerDot, outerDotOpacity]}
            />
            <Animated.View
                style={[styles.dot, dotOpacity]}
            />
        </TouchableOpacity>
    );
};

export default Paginator;
