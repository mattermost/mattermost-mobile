// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import {useBanner} from './hooks/useBanner';

import type {BannerProps} from './types';

export type {BannerProps};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        gap: 8,
    },
});

/**
 * Banner - A flexible banner component
 *
 * Renders content with fade and slide animations. Supports swipe-to-dismiss functionality.
 *
 * @example
 * ```tsx
 * <Banner
 *   dismissible={true}
 *   onDismiss={() => console.log('Banner dismissed!')}
 * >
 *   <Text>Your banner content</Text>
 * </Banner>
 * ```
 */
const Banner: React.FC<BannerProps> = ({
    children,
    animationDuration = 250,
    style,
    dismissible = false,
    onDismiss,
    swipeThreshold = 100,
}) => {
    const {animatedStyle, swipeGesture} = useBanner({
        animationDuration,
        dismissible,
        swipeThreshold,
        onDismiss,
    });

    const bannerContent = (
        <Animated.View
            testID='banner-animated-view'
            style={[
                styles.wrapper,
                animatedStyle,
                style,
            ]}
        >
            {children}
        </Animated.View>
    );

    if (dismissible) {
        return (
            <GestureDetector gesture={swipeGesture}>
                {bannerContent}
            </GestureDetector>
        );
    }

    return bannerContent;
};

export default Banner;
