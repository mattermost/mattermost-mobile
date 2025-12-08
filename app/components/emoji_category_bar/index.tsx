// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {selectEmojiCategoryBarSection, useEmojiCategoryBar} from '@hooks/emoji_category_bar';
import {usePreventDoubleTap} from '@hooks/utils';
import {deleteLastGrapheme} from '@utils/grapheme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmojiCategoryBarIcon from './icon';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        height: 55,
        paddingHorizontal: 12,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    scrollableContainer: {
        flex: 1,
        marginHorizontal: 8,
    },
    categoriesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    separator: {
        width: 1,
        height: 20,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginHorizontal: 8,
    },
}));

type Props = {
    onSelect?: (index: number | undefined) => void;
}

const EmojiCategoryBar = ({onSelect}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {currentIndex, icons} = useEmojiCategoryBar();
    const keyboardContext = useKeyboardAnimationContext();
    const {
        focusInput,
        updateValue,
        updateCursorPosition,
        cursorPositionRef,
    } = keyboardContext;

    // Only show keyboard/delete buttons if we're in input accessory view mode
    // Check if updateValue is available (not null) to determine if we're in input accessory context
    const showActionButtons = updateValue !== null;

    const scrollToIndex = useCallback((index: number) => {
        if (onSelect) {
            onSelect(index);
            return;
        }

        selectEmojiCategoryBarSection(index);
    }, [onSelect]);

    const handleKeyboardPress = usePreventDoubleTap(useCallback(() => {
        focusInput();
    }, [focusInput]));

    const deleteCharFromCurrentCursorPosition = useCallback(() => {
        if (!updateValue || !updateCursorPosition || !cursorPositionRef) {
            return;
        }

        const currentCursorPosition = cursorPositionRef.current;
        if (currentCursorPosition === 0) {
            return;
        }

        updateValue((value: string) => {
            const result = deleteLastGrapheme(value, currentCursorPosition);
            cursorPositionRef.current = result.cursorPosition;
            updateCursorPosition(result.cursorPosition);
            return result.text;
        });
    }, [updateValue, updateCursorPosition, cursorPositionRef]);

    if (!icons) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='emoji_picker.category_bar'
        >
            {showActionButtons && (
                <>
                    <TouchableWithFeedback
                        onPress={handleKeyboardPress}
                        style={styles.actionButton}
                        type='opacity'
                        testID='emoji_picker.keyboard_button'
                    >
                        <CompassIcon
                            name='keyboard-outline'
                            size={20}
                            style={styles.actionIcon}
                        />
                    </TouchableWithFeedback>

                    <View style={styles.separator}/>
                </>
            )}

            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.scrollableContainer}
                contentContainerStyle={styles.categoriesContainer}
            >
                {icons.map((icon, index) => (
                    <EmojiCategoryBarIcon
                        currentIndex={currentIndex}
                        key={icon.key}
                        icon={icon.icon}
                        index={index}
                        scrollToIndex={scrollToIndex}
                        theme={theme}
                    />
                ))}
            </ScrollView>

            {showActionButtons && (
                <>
                    <View style={styles.separator}/>

                    <TouchableWithFeedback
                        onPress={deleteCharFromCurrentCursorPosition}
                        style={styles.actionButton}
                        type='opacity'
                        testID='emoji_picker.delete_button'
                    >
                        <CompassIcon
                            name='backspace-outline'
                            size={20}
                            style={styles.actionIcon}
                        />
                    </TouchableWithFeedback>
                </>
            )}
        </View>
    );
};

export default EmojiCategoryBar;

