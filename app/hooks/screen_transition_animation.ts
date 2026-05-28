// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useFocusEffect} from 'expo-router';
import {useCallback, useEffect, useRef} from 'react';
import {AppState, Platform} from 'react-native';
import {cancelAnimation, useReducedMotion, useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

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
    const animationDuration = Platform.OS === 'android' ? 250 : 350;

    // Keep a ref so the useFocusEffect cleanup always reads the latest values
    // without adding them as dependencies (which would re-trigger cleanup on rotation/motion changes)
    const latestRef = useRef({width, shouldAnimate});
    useEffect(() => {
        latestRef.current = {width, shouldAnimate};
    }, [width, shouldAnimate]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }), []);

    useFocusEffect(
        useCallback(() => {
            const {shouldAnimate: sa} = latestRef.current;
            translateX.value = sa ? withTiming(0, {duration: animationDuration}) : 0;

            const sub = AppState.addEventListener('change', (state) => {
                if (state === 'inactive' || state === 'background') {
                    // Freeze the animation at its current value so the UI thread doesn't
                    // race to completion while the app is backgrounded.
                    cancelAnimation(translateX);
                } else if (state === 'active') {
                    cancelAnimation(translateX);
                    translateX.value = latestRef.current.shouldAnimate ? withTiming(0, {duration: animationDuration}) : 0;
                }
            });

            return () => {
                sub.remove();
                const {width: w, shouldAnimate: saBlur} = latestRef.current;
                translateX.value = saBlur ? withTiming(-w, {duration: animationDuration}) : 0;
            };
        }, [translateX, animationDuration]),
    );

    useEffect(() => {
        if (!shouldAnimate) {
            translateX.value = 0;
        }
    }, [translateX, shouldAnimate]);

    return animatedStyle;
};
