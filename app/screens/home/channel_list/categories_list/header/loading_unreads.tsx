// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.awayIndicator,
        borderRadius: 5,
        height: 8,
        marginLeft: 3,
        top: 1,
        width: 8,
    },
}));

const LoadingUnreads = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [loading, setLoading] = useState(true);
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }), []);

    useEffect(() => {
        if (loading) {
            opacity.value = withRepeat(
                withTiming(1, {duration: 500, easing: Easing.ease}),
                -1,
                true,
            );
        } else {
            opacity.value = withTiming(0, {duration: 300, easing: Easing.ease});
        }
    }, [loading]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.FETCHING_POSTS, (value: boolean) => {
            cancelAnimation(opacity);
            setLoading(value);
        });

        return () => listener.remove();
    }, [loading]);

    if (!loading) {
        return null;
    }

    return <Animated.View style={[style.container, animatedStyle]}/>;
};

export default LoadingUnreads;
