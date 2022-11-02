// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, useWindowDimensions, TouchableOpacity} from 'react-native';
import Animated, {interpolate, useAnimatedStyle} from 'react-native-reanimated';

import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    data: any;
    theme: Theme;
    scrollX: Animated.SharedValue<number>;
    moveToSlide: any;
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
    button: {
        marginTop: 5,
    },
}));

const Paginator = ({
    theme,
    data,
    scrollX,
    moveToSlide,
}: Props) => {
    return (
        <View style={{flexDirection: 'column', height: 10}}>
            <View style={{flexDirection: 'row', height: 5}}>
                {data.map((item: any, i: number) => {
                    return (
                        <Dot
                            item={item}
                            key={item.id}
                            theme={theme}
                            moveToSlide={moveToSlide}
                            index={i}
                            scrollX={scrollX}
                        />
                    );
                })}
            </View>
        </View>
    );
};

type DotProps = {
    item: any;
    index: number;
    scrollX: Animated.SharedValue<number>;
    theme: Theme;
    moveToSlide: any;
};

const Dot = ({item, index, scrollX, theme, moveToSlide}: DotProps) => {
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
            key={item.id}
        >
            <Animated.View
                style={[styles.fixedDot]}
                key={'fixed-' + item.id + index.toString()}
            />
            <Animated.View
                style={[styles.outerDot, outerDotOpacity]}
                key={'outer-' + item.id + index.toString()}
            />
            <Animated.View
                style={[styles.dot, dotOpacity]}
                key={'inner-' + item.id + index.toString()}
            />
        </TouchableOpacity>
    );
};

export default Paginator;
