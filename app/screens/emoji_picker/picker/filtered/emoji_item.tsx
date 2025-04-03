// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {Keyboard, Text, TouchableOpacity, View} from 'react-native';

import Emoji from '@components/emoji';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type TouchableEmojiProps = {
    name: string;
    onEmojiPress: (emojiName: string) => void;
}

const getStyleSheetFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
            overflow: 'hidden',
        },
        emojiContainer: {
            marginRight: 5,
        },
        emoji: {
            color: '#000',
        },
        emojiText: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
    };
});

const EmojiTouchable = ({name, onEmojiPress}: TouchableEmojiProps) => {
    const theme = useTheme();
    const style = getStyleSheetFromTheme(theme);

    const onPress = useCallback(() => {
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }
        onEmojiPress(name);
    }, [name, onEmojiPress]);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={style.container}
        >
            <View style={style.emojiContainer}>
                <Emoji
                    emojiName={name}
                    textStyle={style.emoji}
                    size={20}
                />
            </View>
            <Text style={style.emojiText}>{`:${name}:`}</Text>
        </TouchableOpacity>
    );
};

export default memo(EmojiTouchable);
