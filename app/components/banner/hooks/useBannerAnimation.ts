// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import type {BannerPosition} from '../Banner';

interface UseBannerAnimationProps {
    visible: boolean;
    position: BannerPosition;
    animationDuration: number;
}

export const useBannerAnimation = ({
    visible,
    position,
    animationDuration,
}: UseBannerAnimationProps) => {
    const opacity = useSharedValue(visible ? 1 : 0);
    const slideOffset = position === 'top' ? -50 : 50;
    const translateY = useSharedValue(visible ? 0 : slideOffset);
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

    React.useEffect(() => {
        if (!isDismissed.value) {
            opacity.value = visible ? 1 : 0;
            const offset = position === 'top' ? -50 : 50;
            translateY.value = visible ? 0 : offset;
            translateX.value = 0;
        }
    }, [visible, position, opacity, translateY, translateX, isDismissed]);

    return {
        opacity,
        translateX,
        translateY,
        isDismissed,
        animatedStyle,
    };
};
