// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {interpolate, SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {MIC_SIZE} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const iconCommon = {
        height: MIC_SIZE,
        width: MIC_SIZE,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    const round = {
        borderRadius: MIC_SIZE / 2,
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
    };

    return {
        mic: {
            ...iconCommon,
            ...round,
        },
        abs: {
            position: 'absolute',
        },
        concentric: {
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

const useConcentricStyles = (circleId: number, sharedValue: SharedValue<number>) => {
    const circles = [1.5, 2.5, 3.5];
    return useAnimatedStyle(() => {
        const scale = interpolate(sharedValue.value, [0, 1], [circles[circleId], 1]);
        const opacity = interpolate(sharedValue.value, [0, 1], [1, 0]);

        return {
            opacity,
            transform: [{scale}],
            borderRadius: MIC_SIZE / 2,
        };
    }, [sharedValue]);
};

const AnimatedMicrophone = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const val = useSharedValue(0);

    const firstCircleAnimx = useConcentricStyles(0, val);
    const secondCircleAnimx = useConcentricStyles(1, val);
    const thirdCircleAnimx = useConcentricStyles(2, val);

    useEffect(() => {
        val.value = withRepeat(
            withTiming(1, {duration: 1000}),
            800,
            true,
        );
    }, []);

    return (
        <View style={[styles.mic]}>
            <View style={styles.concentric} >
                <Animated.View style={[styles.mic, styles.abs, firstCircleAnimx]}/>
                <Animated.View style={[styles.mic, styles.abs, secondCircleAnimx]}/>
                <Animated.View style={[styles.mic, styles.abs, thirdCircleAnimx]}/>
            </View>
            <View
                style={[styles.mic, styles.abs]}
            >
                <CompassIcon
                    name='microphone'
                    size={24}
                    color={theme.buttonBg}
                />
            </View>
        </View>

    );
};

export default AnimatedMicrophone;

