// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';

import Emoji from '@components/emoji';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {preventDoubleTap} from '@utils/tap';

import SkinnedEmoji from './skinned_emoji';

type Props = {
    category?: string;
    name: string;
    onEmojiPress: (emoji: string) => void;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

const CATEGORIES_WITH_SKINS = ['people-body'];

const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

const TouchableEmoji = ({category, name, onEmojiPress, size = 30, style}: Props) => {
    const onPress = useCallback(preventDoubleTap(() => onEmojiPress(name)), []);

    let emoji;
    if (category && CATEGORIES_WITH_SKINS.includes(category)) {
        emoji = (
            <SkinnedEmoji
                name={name}
                size={size}
            />
        );
    } else {
        emoji = (
            <Emoji
                emojiName={name}
                size={size}
            />
        );
    }

    return (
        <View
            style={style}
        >
            <TouchableWithFeedback
                hitSlop={hitSlop}
                onPress={onPress}
                style={style}
                type={'opacity'}
            >
                {emoji}
            </TouchableWithFeedback>
        </View>
    );
};

export default React.memo(TouchableEmoji);
