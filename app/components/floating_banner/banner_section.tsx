// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Platform} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_ANDROID,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
    FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET,
} from '@constants/view';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';

import AnimatedBannerItem from './animated_banner_item';

import type {FloatingBannerConfig} from './types';

type BannerSectionProps = {
    sectionBanners: FloatingBannerConfig[];
    position: 'top' | 'bottom';
    onBannerPress: (banner: FloatingBannerConfig) => void;
    onBannerDismiss: (banner: FloatingBannerConfig) => void;
};

const styles = StyleSheet.create({
    containerBase: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    topContainer: {
        top: 0,
        paddingTop: 8,
    },
    bottomContainer: {
        paddingBottom: 8,
    },
});

const BannerSection: React.FC<BannerSectionProps> = ({
    sectionBanners,
    position,
    onBannerPress,
    onBannerDismiss,
}) => {
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();
    const isTop = position === 'top';
    const testID = isTop ? 'floating-banner-top-container' : 'floating-banner-bottom-container';
    const baseBottomOffset = Platform.OS === 'android' ? FLOATING_BANNER_BOTTOM_OFFSET_PHONE_ANDROID : FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS;
    const bottomOffset = isTablet ? (baseBottomOffset + FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET) : baseBottomOffset;
    const containerStyle = isTop ? [styles.containerBase, styles.topContainer] : [
        styles.containerBase,
        styles.bottomContainer,
    ];

    const animatedStyle = useAnimatedStyle(() => {
        if (isTop) {
            return {};
        }

        if (Platform.OS === 'android') {
            return {bottom: withTiming(FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID, {duration: 250})};
        }

        return {bottom: withTiming((keyboardHeight > 0 ? FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS : bottomOffset) + keyboardHeight, {duration: 250})};
    }, [keyboardHeight, isTop, bottomOffset]);

    return (
        <Animated.View
            testID={testID}
            style={[containerStyle, animatedStyle]}
        >
            {sectionBanners.map((banner, index) => (
                <AnimatedBannerItem
                    key={banner.id}
                    banner={banner}
                    index={index}
                    onBannerPress={onBannerPress}
                    onBannerDismiss={onBannerDismiss}
                />
            ))}
        </Animated.View>
    );
};

export default BannerSection;

