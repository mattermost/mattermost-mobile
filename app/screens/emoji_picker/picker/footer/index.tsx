// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps, SHEET_STATE, useBottomSheet, useBottomSheetInternal} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {Platform} from 'react-native';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import {selectEmojiCategoryBarSection} from '@hooks/emoji_category_bar';

import EmojiCategoryBar from '../emoji_category_bar';

function waitForSheetExtended(animatedSheetState: SharedValue<number>, callback: () => void, depth = 250) {
    if (animatedSheetState.value === SHEET_STATE.EXTENDED) {
        callback();
    } else if (depth > 0) {
        requestAnimationFrame(() => waitForSheetExtended(animatedSheetState, callback, depth - 1));
    }
}

const PickerFooter = (props: BottomSheetFooterProps) => {
    const theme = useTheme();
    const keyboardHeight = useKeyboardHeight();
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
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {top: 0, backgroundColor: theme.centerChannelBg, height: 55 + insets.bottom};
    }, [theme, insets.bottom]);

    const heightAnimatedStyle = useAnimatedStyle(() => {
        let height = 55;
        if (keyboardHeight === 0 && Platform.OS === 'ios') {
            height -= 10;
        } else if (keyboardHeight) {
            height = 0;
        }

        return {
            height,
        };
    }, [keyboardHeight]);

    return (
        <BottomSheetFooter
            style={heightAnimatedStyle}
            {...props}
        >
            <Animated.View style={animatedStyle}>
                <EmojiCategoryBar onSelect={scrollToIndex}/>
            </Animated.View>
        </BottomSheetFooter>
    );
};

export default PickerFooter;
