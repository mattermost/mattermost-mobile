// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onPress: () => void;
    isStatusSet: boolean;
    emoji?: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        iconContainer: {
            position: 'absolute',
            left: 14,
            top: 10,
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        emoji: {
            color: theme.centerChannelColor,
        },
    };
});

const CustomStatusEmoji = ({emoji, isStatusSet, onPress, theme}: Props) => {
    const style = getStyleSheet(theme);
    return (
        <TouchableOpacity
            testID={`custom_status.emoji.${isStatusSet ? (emoji || 'speech_balloon') : 'default'}`}
            onPress={onPress}
            style={style.iconContainer}
        >
            {isStatusSet ? (
                <Text style={style.emoji}>
                    <Emoji
                        emojiName={emoji || 'speech_balloon'}
                        size={20}
                    />
                </Text>
            ) : (
                <CompassIcon
                    name='emoticon-happy-outline'
                    size={24}
                    style={style.icon}
                />
            )}
        </TouchableOpacity>
    );
};

export default CustomStatusEmoji;
