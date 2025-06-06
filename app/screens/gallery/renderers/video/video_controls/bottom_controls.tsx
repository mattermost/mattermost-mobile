// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, View, Text, Platform} from 'react-native';
import Animated, {useAnimatedStyle, withTiming, type SharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {GALLERY_FOOTER_HEIGHT} from '@constants/gallery';
import {translateYConfig} from '@hooks/gallery';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';
import {typography} from '@utils/typography';

import {useStateFromSharedValue} from '../hooks';

import ProgressBar from './progress_bar';

import type {VideoControlAction} from './types';

interface BottomControlsProps extends VideoControlAction {
    currentTime: SharedValue<number>;
    duration: number;
    onSeek: (time: number) => void;
    paddingBottom: number;
}

const styles = StyleSheet.create({
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 3,
    },
    container: {
        paddingTop: 8,
        paddingHorizontal: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    time: {
        color: 'white',
        ...typography('Body', 75),
    },
});

const formatTime = (seconds: number) => {
    const h = Math.max(Math.floor(seconds / 3600), 0);
    const m = Math.max(Math.floor((seconds % 3600) / 60), 0);
    const s = Math.max(Math.floor(seconds % 60), 0);

    const hh = h > 0 ? `${h}:` : '';
    const mm = h > 0 ? `${m.toString().padStart(2, '0')}` : `${m}`;
    const ss = s.toString().padStart(2, '0');

    return `${hh}${mm}:${ss}`;
};

const BottomControls: React.FC<BottomControlsProps> = ({
    currentTime,
    duration,
    handleControlAction,
    onSeek,
    paddingBottom,
}) => {
    const currentTimeValue = useStateFromSharedValue(currentTime, 0);
    const insets = useSafeAreaInsets();
    const {headerAndFooterHidden} = useLightboxSharedValues();

    const progress = duration > 0 ? currentTimeValue / duration : 0;

    const onSeekHandler = useCallback((time: number) => {
        handleControlAction('seek', () => {
            onSeek(time);
        });
    }, [handleControlAction, onSeek]);

    const animatedStyle = useAnimatedStyle(() => ({
        marginBottom: withTiming(headerAndFooterHidden.value ? insets.bottom : GALLERY_FOOTER_HEIGHT, translateYConfig),
    }));

    return (
        <Animated.View
            pointerEvents='auto'
            style={[styles.bottomControls, animatedStyle]}
        >
            <View style={[styles.container, styles.row, {paddingBottom}]}>
                <Text style={styles.time}>
                    {formatTime(currentTimeValue)}
                </Text>

                <ProgressBar
                    progress={progress}
                    duration={duration}
                    onSeek={onSeekHandler}
                />

                <Text style={styles.time}>
                    {Platform.OS === 'ios' ? `-${formatTime(duration - currentTimeValue)}` : formatTime(duration)
                    }
                </Text>
            </View>
        </Animated.View>
    );
};

export default BottomControls;
