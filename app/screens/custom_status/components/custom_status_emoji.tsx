// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';

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
            marginLeft: 14,
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
            testID={`custom_status.custom_status_emoji.${isStatusSet ? (emoji || 'speech_balloon') : 'default'}`}
            onPress={onPress}
            style={style.iconContainer}
        >
            {isStatusSet ? (
                <Emoji
                    emojiName={emoji || 'speech_balloon'}
                    size={20}
                />
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
