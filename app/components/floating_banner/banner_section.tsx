// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
    BANNER_SPACING,
} from '@constants/view';
import {useBannerGestureRootPosition} from '@hooks/useBannerGestureRootPosition';

import AnimatedBannerItem from './animated_banner_item';

import type {FloatingBannerConfig, FloatingBannerPosition} from './types';

type BannerSectionProps = {
    sectionBanners: FloatingBannerConfig[];
    position: FloatingBannerPosition;
    onBannerPress: (banner: FloatingBannerConfig) => void;
    onBannerDismiss: (banner: FloatingBannerConfig) => void;
};

const BANNER_HEIGHT = 40;

const styles = StyleSheet.create({
    gestureRoot: {
        position: 'absolute',
        width: '100%',
    },
    containerBase: {
        width: '100%',
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
    if (!sectionBanners.length) {
        return null;
    }

    const insets = useSafeAreaInsets();
    const isTop = position === 'top';
    const testID = isTop ? 'floating-banner-top-container' : 'floating-banner-bottom-container';

    const containerStyle = isTop ? styles.topContainer :styles.bottomContainer;

    const animatedStyle = useAnimatedStyle(() => {
        if (isTop) {
            return {paddingTop: insets.top + 8};
        }

        return {};
    }, [isTop, insets.top]);

    // Limitation: Assumes all banners have the same fixed height (BANNER_HEIGHT).
    // If banners have different heights, the gesture area may not align perfectly.
    // Future improvement: Measure actual banner heights using onLayout for dynamic sizing.
    const containerHeight = useMemo(() => {
        const numBanners = sectionBanners.length;
        const spacing = (numBanners - 1) * BANNER_SPACING;
        return (BANNER_HEIGHT * numBanners) + spacing;
    }, [sectionBanners.length]);

    const gestureRootStyle = useBannerGestureRootPosition({
        position,
        containerHeight,
    });

    return (
        <GestureHandlerRootView
            style={[styles.gestureRoot, gestureRootStyle]}
            pointerEvents='box-none'
        >
            <Animated.View
                testID={testID}
                style={[styles.containerBase, containerStyle, animatedStyle]}
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
        </GestureHandlerRootView>
    );
};

export default BannerSection;

