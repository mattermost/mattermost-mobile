// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {type SharedValue} from 'react-native-reanimated';

import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {EmojiIndicesByAlias, Emojis} from '@utils/emoji';

import EmojiPicker from './emoji_picker';

type Props = {
    height: SharedValue<number>;
    onEmojiPress?: (emoji: string) => void;
    setIsEmojiSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
    isEmojiSearchFocused: boolean;
}

const CustomEmojiPicker: React.FC<Props> = ({
    height,
    isEmojiSearchFocused,
    onEmojiPress,
    setIsEmojiSearchFocused,
}) => {
    const {cursorPositionRef, updateValue, updateCursorPosition} = useKeyboardAnimationContext();

    const handleEmojiPress = useCallback((emojiName: string) => {
        // If onEmojiPress prop is provided, use it (for other use cases)
        if (onEmojiPress) {
            onEmojiPress(emojiName);
            return;
        }

        // Otherwise, use context-based insertion (for input accessory view)
        if (!updateValue || !updateCursorPosition || !cursorPositionRef) {
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
        const currentCursorPosition = cursorPositionRef.current;
        const insertedTextLength = insertedText.length;
        const newCursorPosition = currentCursorPosition + insertedTextLength;

        // Update cursorPositionRef IMMEDIATELY (before React processes the update)
        // This ensures the next rapid click uses the updated position
        cursorPositionRef.current = newCursorPosition;

        // Update cursor position state (for Android and to keep state in sync)
        updateCursorPosition(newCursorPosition);

        const insertEmoji = (v: string): string => {
            // Use the captured cursor position from when the function was created
            return v.slice(0, currentCursorPosition) + insertedText + v.slice(currentCursorPosition);
        };

        updateValue(insertEmoji);
    }, [onEmojiPress, updateValue, updateCursorPosition, cursorPositionRef]);

    return (
        <EmojiPicker
            onEmojiPress={handleEmojiPress}
            testID='custom_emoji_picker'
            setIsEmojiSearchFocused={setIsEmojiSearchFocused}
            isEmojiSearchFocused={isEmojiSearchFocused}
            emojiPickerHeight={height}
        />
    );
};

export default CustomEmojiPicker;
