// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Platform} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Banner from '@components/banner/Banner';
import BannerItem from '@components/banner/banner_item';
import {
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_ANDROID,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
    FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET,
    FLOATING_BANNER_STACK_SPACING,
    FLOATING_BANNER_EXTRA_OFFSET,
} from '@constants/view';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';

import type {BannerConfig} from './types';

type FloatingBannerProps = {
    banners: BannerConfig[];
    onDismiss: (id: string) => void;
};

type BannerSectionProps = {
    sectionBanners: BannerConfig[];
    position: 'top' | 'bottom';
    onDismiss: (id: string) => void;
    executeBannerAction: (banner: BannerConfig) => void;
    dismissBanner: (banner: BannerConfig) => void;
};

const BannerSection: React.FC<BannerSectionProps> = ({
    sectionBanners,
    position,
    executeBannerAction,
    dismissBanner,
}) => {
    const isTablet = useIsTablet();
    const keyboardHeight = useKeyboardHeight();

    if (!sectionBanners.length) {
        return null;
    }

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
            <GestureHandlerRootView style={styles.gestureHandler}>
                {sectionBanners.map((banner, index) => {
                    const {id, dismissible = true, customComponent} = banner;
                    const offsetProps = isTop ? {customTopOffset: index * FLOATING_BANNER_STACK_SPACING} : {customBottomOffset: (index * FLOATING_BANNER_STACK_SPACING) + FLOATING_BANNER_EXTRA_OFFSET};

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

const FloatingBanner: React.FC<FloatingBannerProps> = ({banners, onDismiss}) => {
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

    const topBanners = banners.filter((banner) => (banner.position || 'top') === 'top');
    const bottomBanners = banners.filter((banner) => banner.position === 'bottom');

    return (
        <>
            <BannerSection
                sectionBanners={topBanners}
                position='top'
                onDismiss={onDismiss}
                executeBannerAction={executeBannerAction}
                dismissBanner={dismissBanner}
            />
            <BannerSection
                sectionBanners={bottomBanners}
                position='bottom'
                onDismiss={onDismiss}
                executeBannerAction={executeBannerAction}
                dismissBanner={dismissBanner}
            />
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
