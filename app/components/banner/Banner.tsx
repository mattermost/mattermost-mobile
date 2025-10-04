// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet, type ViewStyle, type StyleProp} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import {useBannerAnimation} from './hooks/useBannerAnimation';
import {useBannerGesture} from './hooks/useBannerGesture';
import {useBannerPosition} from './hooks/useBannerPosition';

/**
 * Position where the banner should appear on screen
 */
export type BannerPosition = 'top' | 'bottom';

/**
 * Predefined placement contexts for common screen types
 */
export type BannerPlacement = 'channel' | 'thread' | 'channels_list' | 'custom';

/**
 * Props for the Banner component
 *
 * A flexible banner component that positions itself absolutely on screen
 * with smart offset calculations based on existing UI elements.
 */
export interface BannerProps {

    /** The content to display inside the banner */
    children: React.ReactNode;

    /**
     * Position of the banner on screen
     * @default 'top'
     */
    position?: BannerPosition;

    /**
     * Include bookmark bar height in top offset calculation
     * Useful when banner should appear below the bookmark bar
     * @default false
     */
    includeBookmarkBar?: boolean;

    /**
     * Include channel banner height in top offset calculation
     * Useful when banner should appear below channel-specific banners
     * @default false
     */
    includeChannelBanner?: boolean;

    /**
     * Additional offset from the top in pixels
     * Added to the calculated safe area and header offsets
     * @default 0
     */
    customTopOffset?: number;

    /**
     * Additional offset from the bottom in pixels
     * Only used when position is 'bottom'
     * @default 0
     */
    customBottomOffset?: number;

    /**
     * Controls banner visibility with fade animation
     * @default true
     */
    visible?: boolean;

    /**
     * Duration of fade animation in milliseconds
     * @default 300
     */
    animationDuration?: number;

    /**
     * Custom styles applied to the banner content
     */
    style?: StyleProp<ViewStyle>;

    /**
     * Custom styles applied to the outer container
     */
    containerStyle?: ViewStyle;

    /**
     * Whether the banner is displayed on a thread screen
     * Affects header height calculations (thread screens don't have main headers)
     * @default false
     */
    threadScreen?: boolean;

    /**
     * Whether the banner can be dismissed by swiping
     * @default false
     */
    dismissible?: boolean;

    /**
     * Callback called when banner is dismissed via swipe
     */
    onDismiss?: () => void;

    /**
     * Swipe threshold to trigger dismiss (in pixels)
     * @default 100
     */
    swipeThreshold?: number;
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        gap: 8,
    },
    container: {
    },
});

/**
 * Banner - A flexible banner component
 *
 * Renders content in an absolutely positioned container with smart offset calculations
 * based on safe areas, headers, and other UI elements. Supports fade and slide animations.
 *
 * @example
 * ```tsx
 * <Banner
 *   position="top"
 *   includeBookmarkBar
 *   visible={showBanner}
 *   dismissible={true}
 *   onDismiss={() => console.log('Banner dismissed!')}
 * >
 *   <Text>Your banner content</Text>
 * </Banner>
 * ```
 */
const Banner: React.FC<BannerProps> = ({
    children,
    position = 'top',
    includeBookmarkBar = false,
    includeChannelBanner = false,
    customTopOffset = 0,
    customBottomOffset = 0,
    visible = true,
    animationDuration = 300,
    style,
    containerStyle,
    threadScreen = false,
    dismissible = false,
    onDismiss,
    swipeThreshold = 100,
}) => {
    const {positionStyle} = useBannerPosition({
        position,
        includeBookmarkBar,
        includeChannelBanner,
        customTopOffset,
        customBottomOffset,
        threadScreen,
    });

    const {opacity, translateX, isDismissed, animatedStyle} = useBannerAnimation({
        visible,
        position,
        animationDuration,
    });

    const {swipeGesture} = useBannerGesture({
        dismissible,
        swipeThreshold,
        onDismiss,
        translateX,
        opacity,
        isDismissed,
    });

    const bannerContent = (
        <Animated.View
            testID='banner-animated-view'
            style={[
                styles.wrapper,
                positionStyle,
                animatedStyle,
                style,
            ]}
        >
            <View style={[styles.container, containerStyle]}>
                {children}
            </View>
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
