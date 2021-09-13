// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type CustomStatusEmojiProps = {
    customStatus?: UserCustomStatus;
    isStatusSet: boolean;
    theme: Theme;
}

const CustomStatusEmoji = ({customStatus, isStatusSet, theme}: CustomStatusEmojiProps) => {
    const styles = getStyleSheet(theme);

    return (
        <View
            testID={`custom_status.emoji.${isStatusSet ? customStatus?.emoji : 'default'}`}
        >
            {isStatusSet && customStatus?.emoji ? (
                <Emoji
                    emojiName={customStatus?.emoji}
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

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        customStatusIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

export default CustomStatusEmoji;
