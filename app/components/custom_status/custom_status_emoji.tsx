// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View} from 'react-native';

import Emoji from '@components/emoji';

interface ComponentProps {
    customStatus: UserCustomStatus;
    emojiSize?: number;
    style?: StyleProp<TextStyle>;
    testID?: string;
}

const CustomStatusEmoji = ({customStatus, emojiSize = 16, style, testID}: ComponentProps) => {
    if (customStatus.emoji) {
        return (
            <View
                style={style}
                testID={`${testID}.custom_status.custom_status_emoji.${customStatus.emoji}`}
            >
                <Emoji
                    size={emojiSize}
                    emojiName={customStatus.emoji}
                />
            </View>
        );
    }

    return null;
};

export default CustomStatusEmoji;
