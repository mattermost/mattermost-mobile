// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {Platform, type ViewStyle} from 'react-native';

import {
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_ANDROID,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
    FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET,
    TABLET_SIDEBAR_WIDTH,
} from '@constants/view';
import {useIsTablet, useKeyboardHeight, useWindowDimensions} from '@hooks/device';

import type {FloatingBannerPosition} from '@components/floating_banner/types';

const BANNER_TABLET_WIDTH_PERCENTAGE = 96;

type UseBannerGestureRootPositionParams = {
    position: FloatingBannerPosition;
    containerHeight: number;
};

export const useBannerGestureRootPosition = ({position, containerHeight}: UseBannerGestureRootPositionParams): ViewStyle => {
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();
    const {width: windowWidth} = useWindowDimensions();
    const isTop = position === 'top';
    const baseBottomOffset = Platform.OS === 'android' ? FLOATING_BANNER_BOTTOM_OFFSET_PHONE_ANDROID : FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS;
    const bottomOffset = isTablet ? (baseBottomOffset + FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET) : baseBottomOffset;

    return useMemo(() => {
        const baseStyle: ViewStyle = {height: containerHeight};

        if (isTablet) {
            const diffWidth = windowWidth - TABLET_SIDEBAR_WIDTH;
            const tabletWidth = (BANNER_TABLET_WIDTH_PERCENTAGE / 100) * diffWidth;
            baseStyle.maxWidth = tabletWidth;
            baseStyle.alignSelf = 'center';
        }

        if (isTop) {
            return {...baseStyle, top: 0};
        }

        if (Platform.OS === 'android') {
            return {
                ...baseStyle,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
            };
        }

        return {
            ...baseStyle,
            bottom: (keyboardHeight > 0 ? FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS : bottomOffset) + keyboardHeight,
        };
    }, [isTop, keyboardHeight, bottomOffset, containerHeight, isTablet, windowWidth]);
};

export const testExports = {
    BANNER_TABLET_WIDTH_PERCENTAGE,
};
