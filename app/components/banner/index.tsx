// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, StyleSheet, type ViewStyle} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    runOnJS,
    useAnimatedGestureHandler,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {BOOKMARKS_BAR_HEIGHT, CHANNEL_BANNER_HEIGHT, DEFAULT_HEADER_HEIGHT, TABLET_HEADER_HEIGHT} from '@constants/view';
import {useIsTablet} from '@hooks/device';

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
    style?: ViewStyle;

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

const getDefaultStyles = () => StyleSheet.create({
    wrapper: {
        position: 'absolute',
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
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const styles = getDefaultStyles();

    const opacity = useSharedValue(visible ? 1 : 0);
    const slideOffset = position === 'top' ? -50 : 50;
    const translateY = useSharedValue(visible ? 0 : slideOffset);

    const translateX = useSharedValue(0);
    const isDismissed = useSharedValue(false);

    const positionStyle = useMemo(() => {
        if (position === 'bottom') {
            return {
                bottom: customBottomOffset,
            };
        }

        let topOffset = insets.top + customTopOffset;

        const shouldAddTabletHeader = isTablet && !threadScreen;
        const shouldAddPhoneHeader = !isTablet && !threadScreen;

        if (shouldAddTabletHeader) {
            topOffset += TABLET_HEADER_HEIGHT;
        } else if (shouldAddPhoneHeader) {
            topOffset += DEFAULT_HEADER_HEIGHT;
        }

        if (includeBookmarkBar) {
            topOffset += BOOKMARKS_BAR_HEIGHT;
        }

        if (includeChannelBanner) {
            topOffset += CHANNEL_BANNER_HEIGHT;
        }

        topOffset += 8;

        return {
            top: topOffset,
        };
    }, [
        position,
        insets.top,
        isTablet,
        threadScreen,
        includeBookmarkBar,
        includeChannelBanner,
        customTopOffset,
        customBottomOffset,
    ]);

    const swipeGestureHandler = useAnimatedGestureHandler({
        onStart: (_, context) => {
            (context as any).startX = translateX.value;
        },
        onActive: (event, context) => {
            if (!dismissible) {
                return;
            }

            translateX.value = (context as any).startX + event.translationX;
        },
        onEnd: () => {
            if (!dismissible) {
                return;
            }

            const shouldDismiss = Math.abs(translateX.value) > swipeThreshold;

            if (shouldDismiss && !isDismissed.value) {
                isDismissed.value = true;
                translateX.value = withTiming(
                    translateX.value > 0 ? 300 : -300,
                    {duration: 200},
                );
                opacity.value = withTiming(0, {duration: 200});

                if (onDismiss) {
                    runOnJS(onDismiss)();
                }
            } else {
                translateX.value = withTiming(0, {duration: 200});
            }
        },
    });

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: withTiming(opacity.value, {duration: animationDuration}),
        transform: [
            {
                translateY: withTiming(translateY.value, {duration: animationDuration}),
            },
            {
                translateX: translateX.value,
            },
        ],
    }));

    React.useEffect(() => {
        if (!isDismissed.value) {
            opacity.value = visible ? 1 : 0;
            const offset = position === 'top' ? -50 : 50;
            translateY.value = visible ? 0 : offset;
            translateX.value = 0;
        }
    }, [visible, position, opacity, translateY, translateX, isDismissed]);

    const bannerContent = (
        <Animated.View
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
            <PanGestureHandler onGestureEvent={swipeGestureHandler}>
                {bannerContent}
            </PanGestureHandler>
        );
    }

    return bannerContent;
};

export default Banner;
