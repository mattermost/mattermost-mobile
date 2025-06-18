// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {Platform, useWindowDimensions} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {useReducedMotion, useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';

export const useScreenTransitionAnimation = (componentId: string) => {
    const {width} = useWindowDimensions();
    const reducedMotion = useReducedMotion();
    const translateX = useSharedValue(reducedMotion ? 0 : width);

    const animatedStyle = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    useEffect(() => {
        translateX.value = 0;

        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
            },
            componentDidDisappear: () => {
                translateX.value = reducedMotion ? 0 : -width;
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);

        return () => unsubscribe.remove();
    }, [componentId, translateX, width, reducedMotion]);

    return animatedStyle;
};
