// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable} from 'react-native-gesture-handler';
import {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    children: React.ReactNode;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export default function PressableOpacity({children, onPress, style, testID}: Props) {
    const cancelOpacity = useSharedValue(1);

    const cancelAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: cancelOpacity.value,
        };
    });

    const cancelPressIn = useCallback(() => {
        cancelOpacity.value = withTiming(0.5, {duration: 100});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- cancelOpacity is a shared value

    const cancelPressOut = useCallback(() => {
        cancelOpacity.value = withTiming(1, {duration: 100});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- cancelOpacity is a shared value

    return (
        <Pressable
            onPressIn={cancelPressIn}
            onPressOut={cancelPressOut}
            onPress={onPress}
            style={[style, cancelAnimatedStyle]}
            testID={testID || 'pressable-opacity'}
        >
            {children}
        </Pressable>
    );
}
