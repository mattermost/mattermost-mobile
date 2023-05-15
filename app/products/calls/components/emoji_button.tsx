// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {
    Platform,
    Pressable,
    type PressableAndroidRippleConfig,
    type PressableStateCallbackType,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import Emoji from '@components/emoji';

type Props = {
    emojiName: string;
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

const androidRippleConfig: PressableAndroidRippleConfig = {borderless: true, radius: 24, color: '#FFF'};

const EmojiButton = ({emojiName, onPress, style}: Props) => {
    const pressableStyle = useCallback((pressed: PressableStateCallbackType) => ([
        pressedStyle(pressed),
        style,
    ]), [style]);

    return (
        <Pressable
            android_ripple={androidRippleConfig}
            hitSlop={5}
            onPress={onPress}
            style={pressableStyle}
        >
            <Emoji
                emojiName={emojiName}
                size={24}
            />
        </Pressable>
    );
};

export default EmojiButton;
