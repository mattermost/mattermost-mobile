// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        height: 14,
        borderRadius: 7,
        borderBottomColor: changeOpacity(theme.sidebarText, 0.16),
        borderLeftColor: theme.sidebarText,
        borderRightColor: changeOpacity(theme.sidebarText, 0.16),
        borderTopColor: changeOpacity(theme.sidebarText, 0.16),
        borderWidth: 2,
        marginLeft: 5,
        width: 14,
    },
}));

const LoadingUnreads = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [loading, setLoading] = useState(true);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{
            rotateZ: `${rotation.value}deg`,
        }],
    }), [loading]);

    useEffect(() => {
        if (loading) {
            opacity.value = 1;
            rotation.value = withRepeat(withTiming(360, {duration: 750, easing: Easing.ease}), -1);
        } else {
            opacity.value = withTiming(0, {duration: 300, easing: Easing.ease});
            cancelAnimation(rotation);
        }

        return () => {
            cancelAnimation(opacity);
            cancelAnimation(rotation);
        };
    }, [loading]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.FETCHING_POSTS, (value: boolean) => {
            setLoading(value);
            if (value) {
                rotation.value = 0;
            }
        });

        return () => listener.remove();
    }, []);

    if (!loading) {
        return null;
    }

    return <Animated.View style={[style.container, animatedStyle]}/>;
};

export default LoadingUnreads;
