// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React, {type FC} from 'react';
import {Platform} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';

import EmojiCategoryBar from '../emoji_category_bar';

const PickerFooter: FC<BottomSheetFooterProps> = ({...props}) => {
    const theme = useTheme();
    const keyboardHeight = useKeyboardHeight();

    const animatedStyle = useAnimatedStyle(() => {
        const paddingBottom = withTiming(
            Platform.OS === 'ios' ? 20 : 0,
            {duration: 250},
        );
        return {backgroundColor: theme.centerChannelBg, paddingBottom};
    }, [theme]);

    const heightAnimatedStyle = useAnimatedStyle(() => {
        let height = 55;
        if (keyboardHeight === 0 && Platform.OS === 'ios') {
            height += 20;
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
            <Animated.View style={[animatedStyle]}>
                <EmojiCategoryBar/>
            </Animated.View>
        </BottomSheetFooter>
    );
};

export default PickerFooter;
