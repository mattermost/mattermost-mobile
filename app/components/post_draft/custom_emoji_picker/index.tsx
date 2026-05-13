// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {isEdgeToEdge} from '@constants/device';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {EmojiIndicesByAlias, Emojis} from '@utils/emoji';
import {makeStyleSheetFromTheme} from '@utils/theme';

import EmojiPicker from './emoji_picker';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    animatedContainer: {
        backgroundColor: theme.centerChannelBg,
        overflow: 'hidden',
        width: '100%',
    },
}));

const CustomEmojiPicker: React.FC = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {
        stateContext,
        updateValue,
        updateCursorPosition,
        getCursorPosition,
        setCursorPosition,
        isEmojiSearchFocused,
        setIsEmojiSearchFocused,
    } = useKeyboardState();

    const animatedStyle = useAnimatedStyle(() => {
        const height = stateContext.inputAccessoryHeight.value;
        return {
            height,
        };

        // Shared values don't need to be in dependencies - they're stable references
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEmojiPress = useCallback((emojiName: string) => {
        if (!updateValue || !updateCursorPosition) {
            return;
        }

        const name = emojiName.trim();

        // Calculate the inserted text first to determine its length
        let insertedText = '';
        if (EmojiIndicesByAlias.get(name)) {
            const emoji = Emojis[EmojiIndicesByAlias.get(name)!];
            if (emoji.category === 'custom') {
                insertedText = ` :${emojiName}: `;
            } else {
                const unicode = emoji.image;
                if (unicode) {
                    const codeArray = unicode.split('-');
                    const convertToUnicode = (acc: string, c: string) => {
                        return acc + String.fromCodePoint(parseInt(c, 16));
                    };
                    insertedText = codeArray.reduce(convertToUnicode, '');
                } else {
                    insertedText = ` :${emojiName}: `;
                }
            }
        } else {
            insertedText = ` :${emojiName}: `;
        }

        // Read cursor position and calculate new position immediately
        // This ensures rapid clicks use the correct position
        const currentCursorPosition = getCursorPosition();
        const insertedTextLength = insertedText.length;
        const newCursorPosition = currentCursorPosition + insertedTextLength;

        // Update cursor position IMMEDIATELY (before React processes the update)
        // This ensures the next rapid click uses the updated position
        setCursorPosition(newCursorPosition);

        // Update cursor position state
        updateCursorPosition(newCursorPosition);

        const insertEmoji = (v: string): string => {
            // Use the captured cursor position from when the function was created
            return v.slice(0, currentCursorPosition) + insertedText + v.slice(currentCursorPosition);
        };

        updateValue(insertEmoji);
    }, [updateValue, updateCursorPosition, getCursorPosition, setCursorPosition]);

    return (
        <View style={isEdgeToEdge && styles.container}>
            <Animated.View style={[styles.animatedContainer, animatedStyle]}>
                <EmojiPicker
                    onEmojiPress={handleEmojiPress}
                    testID='custom_emoji_picker'
                    setIsEmojiSearchFocused={setIsEmojiSearchFocused}
                    isEmojiSearchFocused={isEmojiSearchFocused}
                    emojiPickerHeight={stateContext.inputAccessoryHeight}
                />
            </Animated.View>
        </View>
    );
};

export default CustomEmojiPicker;
