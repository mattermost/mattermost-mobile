// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Keyboard, Platform, Pressable, StyleSheet} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';

type Props = {
    onPress: () => void;
    color?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginLeft: 4,
    },
});

const AnimatedBackButton = ({onPress, color = '#007AFF'}: Props) => {
    const translateX = useSharedValue(0);

    useEffect(() => {
        // iOS uses 'Will' events, Android uses 'Did' events
        const showEvent =
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent =
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const keyboardShowListener = Keyboard.addListener(showEvent, () => {
            translateX.value = withTiming(100, {duration: 250});
        });

        const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
            translateX.value = withTiming(0, {duration: 250});
        });

        return () => {
            keyboardShowListener.remove();
            keyboardHideListener.remove();
        };
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }));

    return (
        <AnimatedPressable
            onPress={onPress}
            style={[styles.container, animatedStyle]}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
            <CompassIcon
                name='arrow-left'
                size={24}
                color={color}
            />
        </AnimatedPressable>
    );
};

export default AnimatedBackButton;
