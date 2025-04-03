// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, StyleSheet} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type WithTimingConfig,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {SelectedTrackType, type OnPlaybackRateChangeData, type VideoRef} from 'react-native-video';

import {updateLocalFilePath} from '@actions/local/file';
import {CaptionsEnabledContext} from '@calls/context';
import {getTranscriptionUri} from '@calls/utils';
import {Events} from '@constants';
import {GALLERY_FOOTER_HEIGHT, VIDEO_INSET} from '@constants/gallery';
import {useServerUrl} from '@context/server';

import DownloadWithAction from '../footer/download_with_action';

import VideoError from './error';

import type {ImageRendererProps} from '../image_renderer';
import type {GalleryAction} from '@typings/screens/gallery';

interface VideoRendererProps extends ImageRendererProps {
    index: number;
    initialIndex: number;
    onShouldHideControls: (hide: boolean) => void;
}

const timingConfig: WithTimingConfig = {
    duration: 250,
    easing: Easing.bezier(0.33, 0.01, 0, 1),
};

const styles = StyleSheet.create({
    video: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
});

const VideoRenderer = ({height, index, initialIndex, item, isPageActive, onShouldHideControls, width}: VideoRendererProps) => {
    const fullscreen = useSharedValue(false);
    const {bottom} = useSafeAreaInsets();
    const serverUrl = useServerUrl();
    const videoRef = useRef<VideoRef>();
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

    const onPlaybackRateChange = useCallback(({playbackRate}: OnPlaybackRateChangeData) => {
        if (isPageActive.value) {
            const isPlaying = Boolean(playbackRate);
            showControls.current = isPlaying;
            onShouldHideControls(isPlaying);
        }
    }, [onShouldHideControls]);

    const onPlaybackStateChange = useCallback(({isPlaying}: {isPlaying: boolean}) => {
        setPaused(!isPlaying);
    }, []);

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

    const dimensionsStyle = useMemo(() => {
        const w = width;
        const h = height - (VIDEO_INSET + GALLERY_FOOTER_HEIGHT + bottom);

        return {width: w, height: h};
    }, [width, height, bottom]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: withTiming(dimensionsStyle.width, timingConfig),
            height: withTiming(dimensionsStyle.height, timingConfig),
        };
    }, [dimensionsStyle]);

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
        <Animated.View style={animatedStyle}>
            <Video

                //@ts-expect-error legacy ref
                ref={videoRef}
                source={source}
                paused={paused}
                poster={item.posterUri}
                posterResizeMode='center'
                onError={onError}
                style={[styles.video, dimensionsStyle]}
                controls={isPageActive.value}
                onPlaybackRateChange={onPlaybackRateChange}
                onFullscreenPlayerWillDismiss={onFullscreenPlayerWillDismiss}
                onFullscreenPlayerWillPresent={onFullscreenPlayerWillPresent}
                onPlaybackStateChanged={onPlaybackStateChange}
                onReadyForDisplay={onReadyForDisplay}
                onEnd={onEnd}
                onTouchStart={handleTouchStart}
                resizeMode='none'
                textTracks={tracks}
                selectedTextTrack={captionsEnabled[index] ? selected : {type: SelectedTrackType.DISABLED, value: ''}}
            />
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
        </Animated.View>
    );
};

export default VideoRenderer;
