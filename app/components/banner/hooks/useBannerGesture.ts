// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {runOnJS, useSharedValue, withTiming} from 'react-native-reanimated';

interface UseBannerGestureProps {
    dismissible: boolean;
    swipeThreshold: number;
    onDismiss?: () => void;
    translateX: {value: number};
    opacity: {value: number};
    isDismissed: {value: boolean};
}

export const useBannerGesture = ({
    dismissible,
    swipeThreshold,
    onDismiss,
    translateX,
    opacity,
    isDismissed,
}: UseBannerGestureProps) => {
    const startX = useSharedValue(0);

    const swipeGesture = useMemo(() => {
        return Gesture.Pan().
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
                        {duration: 200},
                    );
                    opacity.value = withTiming(0, {duration: 200});

                    if (onDismiss) {
                        runOnJS(onDismiss)();
                    }
                } else {
                    translateX.value = withTiming(0, {duration: 200});
                }
            });
    }, [dismissible, onDismiss, swipeThreshold]); // eslint-disable-line react-hooks/exhaustive-deps -- translateX, opacity, isDismissed, startX are shared values and stable references

    return {swipeGesture};
};
