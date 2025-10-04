// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Platform} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Banner from '@components/banner/Banner';
import BannerItem from '@components/banner/banner_item';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';

const BOTTOM_OFFSET_PHONE_IOS = 105;
const BOTTOM_OFFSET_PHONE_ANDROID = 90;
const BOTTOM_OFFSET_WITH_KEYBOARD_IOS = 70;
const BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID = 80;
const TABLET_EXTRA_BOTTOM_OFFSET = 60;
const BANNER_STACK_SPACING = 60;
const BOTTOM_BANNER_EXTRA_OFFSET = 8;

import type {BannerConfig} from './types';

type FloatingBannerProps = {
    banners: BannerConfig[];
    onDismiss: (id: string) => void;
};

const FloatingBanner: React.FC<FloatingBannerProps> = ({banners, onDismiss}) => {
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();

    const executeBannerAction = (banner: BannerConfig) => {
        if (banner.onPress) {
            banner.onPress();
        }
    };

    const dismissBanner = (banner: BannerConfig) => {
        onDismiss(banner.id);
        if (banner.onDismiss) {
            banner.onDismiss();
        }
    };

    if (!banners || !banners.length) {
        return null;
    }

    // Separate banners by position to handle safe area correctly
    const topBanners = banners.filter((banner) => (banner.position || 'top') === 'top');
    const bottomBanners = banners.filter((banner) => banner.position === 'bottom');

    const renderSection = (
        sectionBanners: BannerConfig[],
        position: 'top' | 'bottom',
    ) => {
        if (!sectionBanners.length) {
            return null;
        }

        const isTop = position === 'top';
        const testID = isTop ? 'floating-banner-top-container' : 'floating-banner-bottom-container';
        const baseBottomOffset = Platform.OS === 'android' ? BOTTOM_OFFSET_PHONE_ANDROID : BOTTOM_OFFSET_PHONE_IOS;
        const bottomOffset = isTablet ? (baseBottomOffset + TABLET_EXTRA_BOTTOM_OFFSET) : baseBottomOffset;
        const containerStyle = isTop ? [styles.containerBase, styles.topContainer] : [
            styles.containerBase,
            styles.bottomContainer,
        ];

        const animatedStyle = useAnimatedStyle(() => {
            if (isTop) {
                return {};
            }

            if (Platform.OS === 'android') {
                return {bottom: withTiming(BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID, {duration: 250})};
            }

            return {bottom: withTiming((keyboardHeight > 0 ? BOTTOM_OFFSET_WITH_KEYBOARD_IOS : bottomOffset) + keyboardHeight, {duration: 250})};
        }, [keyboardHeight, isTop, bottomOffset]);

        return (
            <Animated.View
                testID={testID}
                style={[containerStyle, animatedStyle]}
            >
                <GestureHandlerRootView style={styles.gestureHandler}>
                    {sectionBanners.map((banner, index) => {
                        const {id, dismissible = true, customComponent} = banner;
                        const offsetProps = isTop ? {customTopOffset: index * BANNER_STACK_SPACING} : {customBottomOffset: (index * BANNER_STACK_SPACING) + BOTTOM_BANNER_EXTRA_OFFSET};

                        return (
                            <Banner
                                key={id}
                                position={position}
                                visible={true}
                                {...offsetProps}
                                dismissible={dismissible}
                                onDismiss={() => dismissBanner(banner)}
                            >
                                {customComponent || (

                                    <BannerItem
                                        banner={banner}
                                        onPress={executeBannerAction}
                                        onDismiss={dismissBanner}
                                    />
                                )}
                            </Banner>
                        );
                    })}
                </GestureHandlerRootView>
            </Animated.View>
        );
    };

    return (
        <>
            {renderSection(topBanners, 'top')}
            {renderSection(bottomBanners, 'bottom')}
        </>
    );
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
    gestureHandler: {
        width: '100%',
        alignItems: 'center',
    },
});

export default FloatingBanner;

export const testExports = {
    BOTTOM_OFFSET_PHONE_IOS,
    BOTTOM_OFFSET_PHONE_ANDROID,
    TABLET_EXTRA_BOTTOM_OFFSET,
    BOTTOM_OFFSET_WITH_KEYBOARD_IOS,
    BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
};
