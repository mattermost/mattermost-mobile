// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture} from 'react-native-gesture-handler';
import {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

const SWIPE_DISMISS_ANIMATION_DURATION = 200;

interface UseBannerProps {
    animationDuration: number;
    dismissible: boolean;
    swipeThreshold: number;
    onDismiss?: () => void;
}

export const useBanner = ({
    animationDuration,
    dismissible,
    swipeThreshold,
    onDismiss,
}: UseBannerProps) => {
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const isDismissed = useSharedValue(false);

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

    const startX = useSharedValue(0);

    const swipeGesture = Gesture.Pan().
        onStart(() => {
            startX.value = translateX.value;
        }).
        onUpdate((event) => {
            if (!dismissible) {
                return;
            }

            translateX.value = startX.value + event.translationX;
        }).
        onEnd(() => {
            if (!dismissible) {
                return;
            }

            const shouldDismiss = Math.abs(translateX.value) > swipeThreshold;

            if (shouldDismiss && !isDismissed.value) {
                isDismissed.value = true;
                translateX.value = withTiming(
                    translateX.value > 0 ? 300 : -300,
                    {duration: SWIPE_DISMISS_ANIMATION_DURATION},
                );
                opacity.value = withTiming(0, {duration: SWIPE_DISMISS_ANIMATION_DURATION});

                if (onDismiss) {
                    runOnJS(onDismiss)();
                }
            } else {
                translateX.value = withTiming(0, {duration: SWIPE_DISMISS_ANIMATION_DURATION});
            }
        });

    return {
        animatedStyle,
        swipeGesture,
    };
};

