// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps, SHEET_STATE, useBottomSheet, useBottomSheetInternal} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {Platform} from 'react-native';
import {useAnimatedKeyboard} from 'react-native-keyboard-controller';
import Animated, {KeyboardState, useAnimatedReaction, useAnimatedStyle, useSharedValue, type SharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import EmojiCategoryBar from '@components/emoji_category_bar';
import {useTheme} from '@context/theme';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
import {selectEmojiCategoryBarSection} from '@hooks/emoji_category_bar';

function waitForSheetExtended(animatedSheetState: SharedValue<number>, callback: () => void, depth = 250) {
    if (animatedSheetState.value === SHEET_STATE.EXTENDED) {
        callback();
    } else if (depth > 0) {
        requestAnimationFrame(() => waitForSheetExtended(animatedSheetState, callback, depth - 1));
    }
}

const PickerFooter = (props: BottomSheetFooterProps) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();
    const animatedKeyboard = useAnimatedKeyboard();
    const insets = useSafeAreaInsets();
    const {animatedSheetState} = useBottomSheetInternal();
    const {expand} = useBottomSheet();

    const scrollToIndex = useCallback((index: number) => {
        if (animatedSheetState.value === SHEET_STATE.EXTENDED) {
            selectEmojiCategoryBarSection(index);
            return;
        }
        expand();

        waitForSheetExtended(animatedSheetState, () => {
            selectEmojiCategoryBarSection(index);
        });

        // animatedSheetState and expand are stable and don't need to be in dependencies to avoid unnecessary callback recreation
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const invalidState = useSharedValue(false);

    useAnimatedReaction(
        () => animatedKeyboard.state.value,
        (current, previous) => {
            if (current !== previous) {
                const isInvalidTransition = current === KeyboardState.OPEN && previous === KeyboardState.CLOSED;

                if (isInvalidTransition) {
                    invalidState.value = true;
                } else if (invalidState.value && (current === KeyboardState.OPENING || current === KeyboardState.CLOSED || current === KeyboardState.UNKNOWN)) {
                    // Reset invalid flag when we get a valid transition
                    invalidState.value = false;
                }
            }
        },
    );

    const animatedStyle = useAnimatedStyle(() => {
        const width = isTablet ? '60%' : '100%';
        const height = 55 + ((isTablet && Platform.OS === 'ios') || keyboardHeight > 0 ? 0 : insets.bottom);
        return {height, width, alignSelf: 'center', backgroundColor: theme.centerChannelBg, transform: [{translateY: invalidState.value ? 0 : -animatedKeyboard.height.value}]};
    }, [theme, insets.bottom, isTablet, keyboardHeight]);

    return (
        <BottomSheetFooter

            // style={heightAnimatedStyle}
            bottomInset={-insets.bottom}
            {...props}
        >
            <Animated.View style={animatedStyle}>
                <EmojiCategoryBar onSelect={scrollToIndex}/>
            </Animated.View>
        </BottomSheetFooter>
    );
};

export default PickerFooter;
