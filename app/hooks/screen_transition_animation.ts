// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {Platform, useWindowDimensions} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {useReducedMotion, useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

export const useScreenTransitionAnimation = (componentId: string, animated: boolean = true) => {
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

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
            },
            componentDidDisappear: () => {
                translateX.value = shouldAnimate ? -width : 0;
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);

        return () => unsubscribe.remove();
    }, [componentId, translateX, width, reducedMotion, shouldAnimate]);

    useEffect(() => {
        if (!shouldAnimate) {
            translateX.value = 0;
        }
    }, [translateX, shouldAnimate]);

    return animatedStyle;
};
