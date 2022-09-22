// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {random} from 'lodash';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const WAVEFORM_HEIGHT = 40;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            height: WAVEFORM_HEIGHT,
            width: 165,
            flexDirection: 'row',
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
        },
        singleBar: {
            height: WAVEFORM_HEIGHT,
            width: 2,
            backgroundColor: theme.buttonBg,
            marginRight: 1,
        },
    };
});

// if not playing, height = 0
// if paused, height = where they are at
// if playing, then modulate the height
const SoundWave = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const animatedValue = useSharedValue(5);

    const animatedStyles = useAnimatedStyle(() => {
        const newHeight = interpolate(
            animatedValue.value,
            [5, 40],
            [0, 40],
            Extrapolation.EXTEND,
        );
        return {
            height: newHeight,
        };
    }, [animatedValue.value]);

    useEffect(() => {
        animatedValue.value = withRepeat(
            withSpring(40, {
                damping: 10,
                mass: 0.6,
                overshootClamping: true,
            }),
            800,
            true,
        );
    }, []);

    const getAudioBars = () => {
        const bars = [];
        for (let i = 0; i < 50; i++) {
            let height;
            if (random(i, 50) % 2 === 0) {
                height = random(5, 30);
            }
            bars.push(
                <Animated.View
                    key={i}
                    style={[
                        styles.singleBar,
                        {height},
                        !height && animatedStyles,
                    ]}
                />,
            );
        }
        return bars;
    };

    return (
        <View style={styles.container}>
            {getAudioBars()}
        </View>
    );
};

export default SoundWave;
