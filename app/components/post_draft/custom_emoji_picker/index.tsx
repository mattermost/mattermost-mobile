// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';

import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

import EmojiPicker from './emoji_picker';

type Props = {
    onEmojiPress: (emoji: string) => void;
    handleToggleEmojiPicker: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
}

const getStyleSheets = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 9,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
    };
});

const EMOJI_PICKER_HEIGHT = 301;

const CustomEmojiPicker: React.FC<Props> = ({
    onEmojiPress,
    handleToggleEmojiPicker,
    deleteCharFromCurrentCursorPosition,
}) => {
    const theme = useTheme();
    const height = useSharedValue(EMOJI_PICKER_HEIGHT);
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = React.useState(false);

    const styles = getStyleSheets(theme);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: height.value,
        };
    });

    const handleEmojiPress = (emoji: string) => {
        onEmojiPress(emoji);
    };

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <EmojiPicker
                onEmojiPress={handleEmojiPress}
                testID='custom_emoji_picker'
                handleToggleEmojiPicker={handleToggleEmojiPicker}
                deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
                setIsEmojiSearchFocused={setIsEmojiSearchFocused}
                isEmojiSearchFocused={isEmojiSearchFocused}
                emojiPickerHeight={height}
            />
        </Animated.View>);
};

export default CustomEmojiPicker;
