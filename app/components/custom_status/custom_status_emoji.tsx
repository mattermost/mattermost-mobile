// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Emoji from '@components/emoji';

import type {EmojiCommonStyle} from '@typings/components/emoji';
import type {StyleProp, TextStyle} from 'react-native';

interface ComponentProps {
    customStatus: UserCustomStatus;
    emojiSize?: number;
    style?: StyleProp<Intersection<EmojiCommonStyle, TextStyle>>;
}

const CustomStatusEmoji = ({customStatus, emojiSize = 16, style}: ComponentProps) => {
    if (customStatus.emoji) {
        return (
            <Emoji
                size={emojiSize}
                emojiName={customStatus.emoji}
                commonStyle={style}
            />
        );
    }

    return null;
};

export default CustomStatusEmoji;
