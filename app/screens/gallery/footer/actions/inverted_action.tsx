// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Platform,
    Pressable,
    type PressableAndroidRippleConfig,
    type PressableStateCallbackType,
    type StyleProp,
    StyleSheet,
    type ViewStyle,
} from 'react-native';

import CompassIcon from '@components/compass_icon';

type Props = {
    activated: boolean;
    iconName: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

const pressedStyle = ({pressed}: PressableStateCallbackType) => {
    let opacity = 1;
    if (Platform.OS === 'ios' && pressed) {
        opacity = 0.5;
    }

    return [{opacity}];
};

const baseStyle = StyleSheet.create({
    container: {
        width: 40,
        height: 40,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    containerActivated: {
        backgroundColor: '#fff',
    },
});

const androidRippleConfig: PressableAndroidRippleConfig = {borderless: true, radius: 24, color: '#FFF'};

const InvertedAction = ({activated, iconName, onPress, style}: Props) => {
    const pressableStyle = useCallback((pressed: PressableStateCallbackType) => ([
        pressedStyle(pressed),
        baseStyle.container,
        activated && baseStyle.containerActivated,
        style,
    ]), [style, activated]);

    return (
        <Pressable
            android_ripple={androidRippleConfig}
            hitSlop={4}
            onPress={onPress}
            style={pressableStyle}
        >
            <CompassIcon
                color={activated ? '#000' : '#fff'}
                name={iconName}
                size={24}
            />
        </Pressable>
    );
};

export default InvertedAction;
