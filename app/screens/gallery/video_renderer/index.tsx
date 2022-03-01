// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, StyleSheet, useWindowDimensions} from 'react-native';
import Animated, {Easing, useAnimatedRef, useAnimatedStyle, useSharedValue, withTiming, WithTimingConfig} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {LoadError, OnPlaybackRateData} from 'react-native-video';

import CompassIcon from '@components/compass_icon';
import {GALLERY_FOOTER_HEIGHT, VIDEO_INSET} from '@constants/gallery';
import {changeOpacity} from '@utils/theme';

import {ImageRendererProps} from '../image_renderer';

interface VideoRendererProps extends ImageRendererProps {
    index: number;
    initialIndex: number;
    onShouldHideControls: (hide: boolean) => void;
}

const AnimatedVideo = Animated.createAnimatedComponent(Video);
const timingConfig: WithTimingConfig = {
    duration: 250,
    easing: Easing.bezier(0.33, 0.01, 0, 1),
};

const styles = StyleSheet.create({
    playContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
    },
    play: {
        backgroundColor: changeOpacity('#000', 0.16),
        borderRadius: 40,
    },
    video: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
});

const VideoRenderer = ({height, index, initialIndex, item, isPageActive, onShouldHideControls, width}: VideoRendererProps) => {
    const dimensions = useWindowDimensions();
    const fullscreen = useSharedValue(false);
    const {bottom} = useSafeAreaInsets();
    const videoRef = useAnimatedRef<Video>();
    const [paused, setPaused] = useState(!(initialIndex === index));
    const [videoReady, setVideoReady] = useState(false);
    const source = useMemo(() => ({uri: item.uri}), [item.uri]);

    const setFullscreen = (value: boolean) => {
        fullscreen.value = value;
    };

    const onEnd = useCallback(() => {
        setFullscreen(false);
        onShouldHideControls(true);
        setPaused(true);
        videoRef.current?.dismissFullscreenPlayer();
    }, [onShouldHideControls]);

    const onError = useCallback((error: LoadError) => {
        // eslint-disable-next-line no-console
        console.log(
            'Error loading, figure out what to do here... give the option to download?',
            error,
        );
    }, []);

    const onFullscreenPlayerWillDismiss = useCallback(() => {
        setFullscreen(false);
        onShouldHideControls(!paused);
    }, [paused, onShouldHideControls]);

    const onFullscreenPlayerWillPresent = useCallback(() => {
        setFullscreen(true);
        onShouldHideControls(true);
    }, [onShouldHideControls]);

    const onPlay = useCallback(() => {
        setPaused(false);
    }, []);

    const onPlaybackRateChange = useCallback(({playbackRate}: OnPlaybackRateData) => {
        if (isPageActive.value) {
            const isPlaying = Boolean(playbackRate);
            onShouldHideControls(isPlaying);
            setPaused(!isPlaying);
        }
    }, [onShouldHideControls]);

    const onReadyForDisplay = useCallback(() => {
        setVideoReady(true);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        let w = width;
        let h = height - (VIDEO_INSET + GALLERY_FOOTER_HEIGHT + bottom);
        if (fullscreen.value) {
            w = dimensions.width;
            h = dimensions.height;
        }

        return {
            width: withTiming(w, timingConfig),
            height: withTiming(h, timingConfig),
        };
    }, [dimensions.height]);

    useEffect(() => {
        if (initialIndex === index && videoReady) {
            setPaused(false);
        } else if (videoReady) {
            videoRef.current?.seek(0.4);
        }
    }, [index, initialIndex, videoReady]);

    useEffect(() => {
        if (!isPageActive.value && !paused) {
            setPaused(true);
            videoRef.current?.dismissFullscreenPlayer();
        }
    }, [isPageActive.value, paused]);

    return (
        <>
            <AnimatedVideo
                ref={videoRef}
                source={source}
                paused={paused}
                poster={item.posterUri}
                onError={onError}
                style={[styles.video, animatedStyle]}
                controls={isPageActive.value}
                onPlaybackRateChange={onPlaybackRateChange}
                onFullscreenPlayerWillDismiss={onFullscreenPlayerWillDismiss}
                onFullscreenPlayerWillPresent={onFullscreenPlayerWillPresent}
                onReadyForDisplay={onReadyForDisplay}
                onEnd={onEnd}
            />
            {Platform.OS === 'android' && paused && videoReady &&
                <Animated.View style={styles.playContainer}>
                    <CompassIcon
                        color={changeOpacity('#fff', 0.8)}
                        style={styles.play}
                        name='play'
                        onPress={onPlay}
                        size={80}
                    />
                </Animated.View>
            }
        </>
    );
};

export default VideoRenderer;
