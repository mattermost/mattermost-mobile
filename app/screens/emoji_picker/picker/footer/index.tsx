// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, BottomSheetFooterProps, SHEET_STATE, useBottomSheet, useBottomSheetInternal} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {Platform} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {selectEmojiCategoryBarSection} from '@hooks/emoji_category_bar';

import EmojiCategoryBar from '../emoji_category_bar';

const PickerFooter = (props: BottomSheetFooterProps) => {
    const isTablet = useIsTablet();
    const theme = useTheme();
    const {animatedSheetState, animatedKeyboardState} = useBottomSheetInternal();
    const {expand} = useBottomSheet();

    const scrollToIndex = useCallback((index: number) => {
        if (animatedSheetState.value === SHEET_STATE.EXTENDED) {
            selectEmojiCategoryBarSection(index);
            return;
        }
        expand();

        // @ts-expect-error wait until the bottom sheet is epanded
        while (animatedSheetState.value !== SHEET_STATE.EXTENDED) {
            // do nothing
        }

        selectEmojiCategoryBarSection(index);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const paddingBottom = withTiming(
            animatedKeyboardState.value === 1 && Platform.OS === 'ios' ? 0 : 20,
            {duration: 250},
        );
        return {backgroundColor: theme.centerChannelBg, paddingBottom};
    }, [theme]);

    if (isTablet) {
        return null;
    }

    return (
        <BottomSheetFooter {...props}>
            <Animated.View style={animatedStyle}>
                <EmojiCategoryBar onSelect={scrollToIndex}/>
            </Animated.View>
        </BottomSheetFooter>
    );
};

export default PickerFooter;
