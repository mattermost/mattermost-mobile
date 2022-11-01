// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Animated, useWindowDimensions, TouchableOpacity} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    data: any;
    theme: Theme;
    scrollX: any;
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
    },
    outerDot: {
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: theme.buttonBg,
        marginHorizontal: 4,
        marginTop: -4,
        position: 'absolute',
        width: DOT_SIZE,
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
    const styles = getStyleSheet(theme);
    const {width} = useWindowDimensions();

    return (
        <View style={{flexDirection: 'column', height: 10}}>
            <View style={{flexDirection: 'row', height: 5}}>
                {data.map((item: any, i: number) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.25, 1, 0.25],
                        extrapolate: 'clamp',
                    });

                    const opacityOuterDot = scrollX.interpolate({
                        inputRange,
                        outputRange: [0, 0.15, 0],
                        extrapolate: 'clamp',
                    });

                    return (
                        <TouchableOpacity
                            onPress={() => moveToSlide(i)}
                            key={item.id}
                        >
                            <Animated.View
                                style={[styles.outerDot, {
                                    opacity: opacityOuterDot,
                                }]}
                                key={'outer-' + item.id + i.toString()}
                            />
                            <Animated.View
                                style={[styles.dot, {
                                    opacity,
                                }]}
                                key={item.id + i.toString()}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export default Paginator;
