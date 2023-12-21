// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, StyleSheet, useWindowDimensions} from 'react-native';
import Animated, {
    Easing,
    useAnimatedRef,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type WithTimingConfig,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {type OnPlaybackRateData} from 'react-native-video';

import {updateLocalFilePath} from '@actions/local/file';
import {CaptionsEnabledContext} from '@calls/context';
import {getTranscriptionUri} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import {Events} from '@constants';
import {GALLERY_FOOTER_HEIGHT, VIDEO_INSET} from '@constants/gallery';
import {useServerUrl} from '@context/server';
import {changeOpacity} from '@utils/theme';

import DownloadWithAction from '../footer/download_with_action';

import VideoError from './error';

import type {ImageRendererProps} from '../image_renderer';
import type {GalleryAction} from '@typings/screens/gallery';

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
    const serverUrl = useServerUrl();
    const videoRef = useAnimatedRef<Video>();
    const showControls = useRef(!(initialIndex === index));
    const captionsEnabled = useContext(CaptionsEnabledContext);
    const [paused, setPaused] = useState(!(initialIndex === index));
    const [videoReady, setVideoReady] = useState(false);
    const [videoUri, setVideoUri] = useState(item.uri);
    const [downloading, setDownloading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const source = useMemo(() => ({uri: videoUri}), [videoUri]);
    const {tracks, selected} = useMemo(() => getTranscriptionUri(serverUrl, item.postProps), [serverUrl, item.postProps]);

    const setFullscreen = (value: boolean) => {
        fullscreen.value = value;
    };

    const onDownloadSuccess = (path: string) => {
        setVideoUri(path);
        setHasError(false);
        updateLocalFilePath(serverUrl, item.id, path);
    };

    const onEnd = useCallback(() => {
        setFullscreen(false);
        onShouldHideControls(true);
        showControls.current = true;
        setPaused(true);
        videoRef.current?.dismissFullscreenPlayer();
    }, [onShouldHideControls]);

    const onError = useCallback(() => {
        setHasError(true);
    }, []);

    const onFullscreenPlayerWillDismiss = useCallback(() => {
        setFullscreen(false);
        showControls.current = !paused;
        onShouldHideControls(showControls.current);
    }, [paused, onShouldHideControls]);

    const onFullscreenPlayerWillPresent = useCallback(() => {
        setFullscreen(true);
        onShouldHideControls(true);
        showControls.current = true;
    }, [onShouldHideControls]);

    const onPlay = useCallback(() => {
        setPaused(false);
    }, []);

    const onPlaybackRateChange = useCallback(({playbackRate}: OnPlaybackRateData) => {
        if (isPageActive.value) {
            const isPlaying = Boolean(playbackRate);
            showControls.current = isPlaying;
            onShouldHideControls(isPlaying);
            setPaused(!isPlaying);
        }
    }, [onShouldHideControls]);

    const onReadyForDisplay = useCallback(() => {
        setVideoReady(true);
        setHasError(false);
    }, []);

    const handleTouchStart = useCallback(() => {
        showControls.current = !showControls.current;
        onShouldHideControls(showControls.current);
    }, [onShouldHideControls]);

    const setGalleryAction = useCallback((action: GalleryAction) => {
        DeviceEventEmitter.emit(Events.GALLERY_ACTIONS, action);
        if (action === 'none') {
            setDownloading(false);
        }
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        let w = width;
        let h = height - (VIDEO_INSET + GALLERY_FOOTER_HEIGHT + bottom);

        if (hasError) {
            return {height: 0};
        }

        if (fullscreen.value) {
            w = dimensions.width;
            h = dimensions.height;
        } else if (dimensions.width > dimensions.height) {
            w = h;
            h = width;
        }

        return {
            width: withTiming(w, timingConfig),
            height: withTiming(h, timingConfig),
        };
    }, [dimensions, hasError]);

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
                onTouchStart={handleTouchStart}
                textTracks={tracks}
                selectedTextTrack={captionsEnabled[index] ? selected : {type: 'disabled'}}
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
            {hasError &&
            <VideoError
                filename={item.name}
                isDownloading={downloading}
                isRemote={videoUri.startsWith('http')}
                onShouldHideControls={handleTouchStart}
                posterUri={item.posterUri}
                setDownloading={setDownloading}
                height={item.height}
                width={item.width}
            />
            }
            {downloading &&
            <DownloadWithAction
                action='external'
                setAction={setGalleryAction}
                onDownloadSuccess={onDownloadSuccess}
                item={item}
            />
            }
        </>
    );
};

export default VideoRenderer;
