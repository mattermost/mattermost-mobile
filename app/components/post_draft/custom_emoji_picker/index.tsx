// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type SharedValue} from 'react-native-reanimated';

import EmojiPicker from './emoji_picker';

type Props = {
    height: SharedValue<number>;
    onEmojiPress: (emoji: string) => void;
    handleToggleEmojiPicker: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
}

const CustomEmojiPicker: React.FC<Props> = ({
    height,
    onEmojiPress,
    handleToggleEmojiPicker,
    deleteCharFromCurrentCursorPosition,
}) => {
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = React.useState(false);
    const handleEmojiPress = (emoji: string) => {
        onEmojiPress(emoji);
    };

    return (
        <EmojiPicker
            onEmojiPress={handleEmojiPress}
            testID='custom_emoji_picker'
            handleToggleEmojiPicker={handleToggleEmojiPicker}
            deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
            setIsEmojiSearchFocused={setIsEmojiSearchFocused}
            isEmojiSearchFocused={isEmojiSearchFocused}
            emojiPickerHeight={height}
        />
    );
};

export default CustomEmojiPicker;
