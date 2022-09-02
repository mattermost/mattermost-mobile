// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type CustomStatusEmojiProps = {
    emoji?: string;
    isStatusSet: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        customStatusIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

const CustomStatusEmoji = ({emoji, isStatusSet}: CustomStatusEmojiProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            testID={`account.custom_status.custom_status_emoji.${isStatusSet ? emoji : 'default'}`}
        >
            {isStatusSet && emoji ? (
                <Emoji
                    emojiName={emoji}
                    size={20}
                />
            ) : (
                <CompassIcon
                    name='emoticon-happy-outline'
                    size={24}
                    style={styles.customStatusIcon}
                />
            )}
        </View>
    );
};

export default CustomStatusEmoji;
