// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {View, type LayoutChangeEvent} from 'react-native';
import {useKeyboardState} from 'react-native-keyboard-controller';
import {Easing, useAnimatedReaction, useSharedValue, withTiming, type SharedValue} from 'react-native-reanimated';

import SearchBar, {type SearchProps} from '@components/search';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
import {setEmojiSkinTone} from '@hooks/emoji_category_bar';
import {DEFAULT_INPUT_ACCESSORY_HEIGHT} from '@hooks/useInputAccessoryView';
import SkinToneSelector from '@screens/emoji_picker/picker/header/skintone_selector';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const SEARCH_BAR_HEIGHT = 56; // paddingTop: 12 + paddingBottom: 12 + search bar ~32px
const SEARCH_CONTAINER_PADDING = 8; // paddingVertical: 4 * 2
const SEARCH_VISIBILITY_OFFSET = 40; // Extra height to ensure search values are visible

type Props = SearchProps & {
    skinTone: string;
    setIsEmojiSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
    emojiPickerHeight: SharedValue<number>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {flex: 1},
    row: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
        backgroundColor: theme.centerChannelBg,
    },
}));

const EmojiPickerHeader: React.FC<Props> = ({
    skinTone,
    emojiPickerHeight,
    setIsEmojiSearchFocused,
    ...props
}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {lastKeyboardHeight: contextLastKeyboardHeight, showInputAccessoryView, isInputAccessoryViewMode} = useKeyboardAnimationContext();
    const containerWidth = useSharedValue(0);
    const isSearching = useSharedValue(false);

    // Use useKeyboardState to get keyboard height
    const {height: keyboardHeight} = useKeyboardState();
    const keyboardHeightShared = useSharedValue(keyboardHeight);

    useEffect(() => {
        const req = requestAnimationFrame(() => {
            setEmojiSkinTone(skinTone);
        });

        return () => cancelAnimationFrame(req);
    }, [skinTone]);

    // Update SharedValue when keyboard height changes
    useEffect(() => {
        keyboardHeightShared.value = keyboardHeight;
    }, [keyboardHeight, keyboardHeightShared]);

    // Reset search state when emoji picker is dismissed to prevent reaction from firing
    useEffect(() => {
        if (!showInputAccessoryView) {
            isSearching.value = false;
            setIsEmojiSearchFocused(false);
        }
    }, [showInputAccessoryView, isSearching, setIsEmojiSearchFocused]);

    // Update emoji picker height when keyboard height changes and search is focused
    useAnimatedReaction(
        () => keyboardHeightShared.value,
        (currentKeyboardH, previousKeyboardH) => {
            // Only update if:
            // 1. Search is focused
            // 2. Emoji picker is still showing (not being dismissed)
            // 3. Keyboard height actually changed
            if (
                isSearching.value &&
                isInputAccessoryViewMode.value &&
                previousKeyboardH !== undefined &&
                previousKeyboardH !== currentKeyboardH
            ) {
                // Skip if keyboard height is 0 (onFocus handler already set correct height using lastKeyboardHeight)
                if (currentKeyboardH === 0) {
                    return;
                }

                // Calculate total height: keyboardHeight + search bar height + search container padding + visibility offset
                const targetHeight = currentKeyboardH + SEARCH_BAR_HEIGHT + SEARCH_CONTAINER_PADDING + SEARCH_VISIBILITY_OFFSET;

                emojiPickerHeight.value = withTiming(targetHeight, {
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                });
            }
        },
        [keyboardHeightShared, isSearching, emojiPickerHeight, isInputAccessoryViewMode],
    );

    const onBlur = useCallback(() => {
        setIsEmojiSearchFocused(false);
        isSearching.value = false;

        // Only restore height if emoji picker is still showing
        // If emoji picker is being dismissed (showInputAccessoryView is false),
        // PostInput.onFocus already handles setting height to 0
        if (showInputAccessoryView) {
            // Restore to original emoji picker height (without search-related additions)
            const originalHeight = contextLastKeyboardHeight > 0 ? contextLastKeyboardHeight : DEFAULT_INPUT_ACCESSORY_HEIGHT;
            emojiPickerHeight.value = withTiming(originalHeight, {duration: 250});
        }
    }, [emojiPickerHeight, isSearching, setIsEmojiSearchFocused, contextLastKeyboardHeight, showInputAccessoryView]);

    const onFocus = useCallback(() => {
        setIsEmojiSearchFocused(true);

        // Use last keyboard height from context if available, otherwise use default input accessory height
        // The useAnimatedReaction will handle real-time updates when keyboard actually opens
        const keyboardH = contextLastKeyboardHeight > 0 ? contextLastKeyboardHeight : DEFAULT_INPUT_ACCESSORY_HEIGHT;
        const targetHeight = keyboardH + SEARCH_BAR_HEIGHT + SEARCH_CONTAINER_PADDING + SEARCH_VISIBILITY_OFFSET;

        // Set height immediately (without animation) to prevent jump
        emojiPickerHeight.value = targetHeight;
        isSearching.value = true;
    }, [emojiPickerHeight, isSearching, setIsEmojiSearchFocused, contextLastKeyboardHeight]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        containerWidth.value = e.nativeEvent.layout.width;
    }, [containerWidth]);

    return (
        <View
            onLayout={onLayout}
            style={styles.row}
        >
            <View style={styles.flex}>
                <SearchBar
                    {...props}
                    onBlur={onBlur}
                    onFocus={onFocus}
                />
            </View>
            <SkinToneSelector
                skinTone={skinTone}
                containerWidth={containerWidth}
                isSearching={isSearching}
            />
        </View>
    );
};

export default EmojiPickerHeader;
