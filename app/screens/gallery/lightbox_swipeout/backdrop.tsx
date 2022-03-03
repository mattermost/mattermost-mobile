// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, ViewStyle} from 'react-native';
import Animated, {AnimatedStyleProp, Extrapolate, interpolate, SharedValue, useAnimatedStyle} from 'react-native-reanimated';

export type BackdropProps = {
    animatedStyles: AnimatedStyleProp<ViewStyle>;
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
                Math.abs(translateY.value),
                [0, 100],
                [1, 0],
                Extrapolate.CLAMP,
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
