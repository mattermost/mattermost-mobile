// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    Pressable,
    type PressableAndroidRippleConfig,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import Emoji from '@components/emoji';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';

type Props = {
    emojiName: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

const androidRippleConfig: PressableAndroidRippleConfig = {borderless: true, radius: 24, color: '#FFF'};

const EmojiButton = ({emojiName, onPress, style}: Props) => {
    const pressableStyle = usePressableOpacityStyle(style);

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
