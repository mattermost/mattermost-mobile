// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, useWindowDimensions, TouchableOpacity} from 'react-native';
import Animated, {interpolate, useAnimatedStyle} from 'react-native-reanimated';

import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    dataLength: number;
    theme: Theme;
    scrollX: Animated.SharedValue<number>;
    moveToSlide: (slideIndexToMove: number) => void;
};

const DOT_SIZE = 16;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const commonStyle = {
        height: DOT_SIZE / 2,
        borderRadius: 5,
        backgroundColor: theme.buttonBg,
        marginHorizontal: DOT_SIZE / 2,
        width: DOT_SIZE / 2,
        opacity: 0.25,
    };
    return {
        dot: {
            ...commonStyle,
        },
        fixedDot: {
            ...commonStyle,
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
        paginatorContainer: {
            flexDirection: 'row',
            height: 15,
            justifyContent: 'space-between',
            width: 120,
        },
    };
});

const Paginator = ({
    theme,
    dataLength,
    scrollX,
    moveToSlide,
}: Props) => {
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.paginatorContainer}>
            {[...Array(dataLength)].map((_, index: number) => {
                return (
                    <Dot
                        key={`key-${index.toString()}`}
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
const Dot = ({
    index,
    scrollX,
    theme,
    moveToSlide,
}: DotProps) => {
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
            hitSlop={{top: 8, left: 8, right: 8, bottom: 8}}
        >
            <Animated.View style={styles.fixedDot}/>
            <Animated.View style={[styles.outerDot, outerDotOpacity]}/>
            <Animated.View style={[styles.dot, dotOpacity]}/>
        </TouchableOpacity>
    );
};

export default Paginator;
