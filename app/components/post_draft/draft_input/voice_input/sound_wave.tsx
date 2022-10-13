// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {random} from 'lodash';
import React from 'react';
import {View} from 'react-native';
import Animated, {cancelAnimation, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSpring} from 'react-native-reanimated';

import {WAVEFORM_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {makeStyleSheetFromTheme} from '@utils/theme';

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

type SoundWaveProps = {
    animating?: boolean;
};

const SoundWave = ({animating = true}: SoundWaveProps) => {
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
    }, []);

    useDidUpdate(() => {
        if (animating) {
            animatedValue.value = withRepeat(
                withSpring(40, {
                    damping: 10,
                    mass: 0.6,
                    overshootClamping: true,
                }),
                800,
                true,
            );
        } else {
            cancelAnimation(animatedValue);
        }
    }, [animating]);

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
