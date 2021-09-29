// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type TouchableEmojiProps = {
    item: string;
    onEmojiPress: (emojiName: string) => void;
}

const TouchableEmoji = ({item, onEmojiPress}: TouchableEmojiProps) => {
    const theme = useTheme();
    const style = getStyleSheetFromTheme(theme);

    const onPress = useCallback(() => onEmojiPress(item), []);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={style.flatListRow}
        >
            <View style={style.flatListEmoji}>
                <Emoji
                    emojiName={item}
                    textStyle={style.emojiText}
                    size={20}
                />
            </View>
            <Text style={style.flatListEmojiName}>{`:${item}:`}</Text>
        </TouchableOpacity>
    );
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        flatListRow: {
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
            overflow: 'hidden',
        },
        flatListEmoji: {
            marginRight: 5,
        },
        emojiText: {
            color: '#000',
            fontWeight: 'bold',
        },
        flatListEmojiName: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
    };
});

export default memo(TouchableEmoji);
