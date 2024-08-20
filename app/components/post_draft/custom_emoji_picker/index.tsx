// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import EmojiPicker from './emoji_picker';

type Props = {
    onEmojiPress: (emoji: string) => void;
    focus?: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
}

const CustomEmojiPicker: React.FC<Props> = ({
    onEmojiPress,
    focus,
    deleteCharFromCurrentCursorPosition,
}) => {
    const handleEmojiPress = (emoji: string) => {
        onEmojiPress(emoji);
    };
    return (
        <View style={{height: 300, padding: 8}}>
            <EmojiPicker
                onEmojiPress={handleEmojiPress}
                testID='custom_emoji_picker'
                focus={focus}
                deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
            />
        </View>);
};

export default CustomEmojiPicker;
