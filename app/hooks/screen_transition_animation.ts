// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useFocusEffect} from 'expo-router';
import {useCallback, useEffect} from 'react';
import {Platform} from 'react-native';
import {useReducedMotion, useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {useWindowDimensions} from './device';

/**
 * Expo Router version - Uses focus/blur events instead of mount/unmount
 * This handles the case where screens stay mounted when pushed/popped
 */
export const useScreenTransitionAnimation = (animated: boolean = true) => {
    const {width} = useWindowDimensions();
    const reducedMotion = useReducedMotion();
    const shouldAnimate = animated && !reducedMotion;
    const translateX = useSharedValue(shouldAnimate ? width : 0);

    const animatedStyle = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    // Use focus effect to handle screen appearing (similar to componentDidAppear)
    useFocusEffect(
        useCallback(() => {
            // Screen is focused (appeared)
            translateX.value = 0;

            return () => {
                // Screen is blurred (disappeared)
                translateX.value = shouldAnimate ? -width : 0;
            };
        }, [translateX, width, shouldAnimate]),
    );

    useEffect(() => {
        if (!shouldAnimate) {
            translateX.value = 0;
        }
    }, [translateX, shouldAnimate]);

    return animatedStyle;
};
