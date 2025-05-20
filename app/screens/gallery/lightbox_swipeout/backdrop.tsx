// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, type ViewStyle} from 'react-native';
import Animated, {type AnimatedStyle, interpolate, type SharedValue, useAnimatedStyle} from 'react-native-reanimated';

export type BackdropProps = {
    animatedStyles: AnimatedStyle<ViewStyle>;
    translateY: SharedValue<number>;
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'black',
    },
});

const Backdrop = ({animatedStyles, translateY}: BackdropProps) => {
    const customBackdropStyles = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                Math.abs(translateY.value / 3),
                [0, 100],
                [1, 0],
                'clamp',
            ),
        };
    }, []);

    return (
        <Animated.View style={[StyleSheet.absoluteFill, customBackdropStyles]}>
            <Animated.View style={[animatedStyles, styles.backdrop]}/>
        </Animated.View>
    );
};

export default Backdrop;
