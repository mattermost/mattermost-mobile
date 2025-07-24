// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, StatusBar, StyleSheet} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {SelectedTrackType, type OnPlaybackStateChangedData, type ReactVideoPoster, type ReactVideoSource, type VideoRef} from 'react-native-video';

import {updateLocalFilePath} from '@actions/local/file';
import {getTranscriptionUri, hasCaptions} from '@calls/utils';
import {Events} from '@constants';
import {ANDROID_VIDEO_INSET, GALLERY_FOOTER_HEIGHT, VIDEO_INSET} from '@constants/gallery';
import {useServerUrl} from '@context/server';
import {transformerTimingConfig} from '@screens/gallery/animation_config/timing';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';
import {toMilliseconds} from '@utils/datetime';

import VideoError from './error';
import {useStateFromSharedValue} from './hooks';
import VideoControls from './video_controls';

import type {GalleryAction, GalleryPagerItem} from '@typings/screens/gallery';

type VideoRendererProps = GalleryPagerItem & {
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
    index: number;
    initialIndex: number;
    hideHeaderAndFooter: (hide?: boolean) => void;
}

const styles = StyleSheet.create({
    video: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        height: '100%',
        width: '100%',
    },
});

const VideoRenderer = ({canDownloadFiles, enableSecureFilePreview, height, index, initialIndex, item, isPageActive, hideHeaderAndFooter, width}: VideoRendererProps) => {
    const {headerAndFooterHidden} = useLightboxSharedValues();
    const {bottom} = useSafeAreaInsets();
    const serverUrl = useServerUrl();
    const videoRef = useRef<VideoRef>();
    const [captionsEnabled, setCaptionsEnabled] = useState(true);
    const [paused, setPaused] = useState(!(initialIndex === index));
    const [videoReady, setVideoReady] = useState(false);
    const [videoUri, setVideoUri] = useState(item.uri);
    const [downloading, setDownloading] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Custom controls state
    const [showCustomControls, setShowCustomControls] = useState(true);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const currentTime = useSharedValue(0);

    const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();
    const progressDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const playbackStateDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isPageActiveValue = useStateFromSharedValue(isPageActive, false);

    const headerAndFooterHiddenValue = useStateFromSharedValue(headerAndFooterHidden, false);

    const {tracks, selected} = useMemo(() => getTranscriptionUri(serverUrl, item.postProps), [serverUrl, item.postProps]);
    const source: ReactVideoSource = useMemo(() => ({uri: videoUri, textTracks: tracks}), [videoUri, tracks]);
    const poster: ReactVideoPoster = useMemo(() => ({
        source: {uri: item.posterUri},
        resizeMode: 'contain',
    }), [item.posterUri]);
    const dimensionsStyle = useMemo(() => {
        const w = width;
        const extra = VIDEO_INSET + GALLERY_FOOTER_HEIGHT + Platform.select({default: 0, android: ANDROID_VIDEO_INSET});
        const insets = headerAndFooterHiddenValue && Platform.OS === 'ios' ? 0 : extra;
        const h = height - (insets + bottom);
        return {width: w, height: h};
    }, [width, height, bottom, headerAndFooterHiddenValue]);
    const seekSeconds = useMemo(() => {
        const durationMs = toMilliseconds({seconds: duration});
        if (durationMs < toMilliseconds({seconds: 10})) {
            return 0;
        } else if (durationMs < toMilliseconds({minutes: 15})) {
            return 10;
        }
        return 30;
    }, [duration]);
    const videoHasCaptions = useMemo(() => hasCaptions(item.postProps), [item.postProps]);

    const onDownloadSuccess = useCallback((path: string) => {
        setVideoUri(path);
        setHasError(false);
        updateLocalFilePath(serverUrl, item.id, path);
    }, [serverUrl, item.id]);

    const onEnd = useCallback(() => {
        hideHeaderAndFooter(false);
        setPaused(true);
        setShowCustomControls(true);
    }, [hideHeaderAndFooter]);

    const onError = useCallback(() => {
        setHasError(true);
    }, []);

    const onProgress = useCallback((data: {currentTime: number}) => {
        if (progressDebounceTimeoutRef.current) {
            clearTimeout(progressDebounceTimeoutRef.current);
        }
        progressDebounceTimeoutRef.current = setTimeout(() => {
            currentTime.value = data.currentTime;
        }, 100);
    }, [currentTime]);

    const onLoad = useCallback((data: {duration: number}) => {
        setDuration(data.duration);
    }, []);

    const onPlaybackStateChanged = useCallback(({isPlaying}: OnPlaybackStateChangedData) => {
        if (playbackStateDebounceTimeoutRef.current) {
            clearTimeout(playbackStateDebounceTimeoutRef.current);
        }
        playbackStateDebounceTimeoutRef.current = setTimeout(() => {
            if (isPageActiveValue) {
                setPaused(!isPlaying);
            }
        }, 200);
    }, [isPageActiveValue]);

    const onReadyForDisplay = useCallback(() => {
        setVideoReady(true);
        setHasError(false);
    }, []);

    const onPlay = useCallback(() => {
        if (Math.floor(currentTime.value) === Math.floor(duration)) {
            // If the video has ended, seek to the beginning
            videoRef.current?.seek(0.0);
        }
        setPaused(false);

    // No need for shared values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration]);

    const onPause = useCallback(() => {
        setPaused(true);
    }, []);

    const onSeek = useCallback((time: number) => {
        videoRef.current?.seek(time);
    }, []);

    const onRewind = useCallback(() => {
        const newTime = Math.max(0, currentTime.value - seekSeconds);
        videoRef.current?.seek(newTime);

    // No need for shared values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seekSeconds]);

    const onForward = useCallback(() => {
        const newTime = Math.min(duration, currentTime.value + seekSeconds);
        videoRef.current?.seek(newTime);

    // No need for shared values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, seekSeconds]);

    const onRateChange = useCallback((rate: number) => {
        setPlaybackRate(rate);
    }, []);

    const onFullscreenToggle = useCallback(() => {
        hideHeaderAndFooter(!headerAndFooterHiddenValue);
        StatusBar.setHidden(!headerAndFooterHiddenValue, 'slide');
    }, [headerAndFooterHiddenValue, hideHeaderAndFooter]);

    const onCaptionsPress = useCallback(() => {
        setCaptionsEnabled((prev) => !prev);
    }, []);

    const setGalleryAction = useCallback((action: GalleryAction) => {
        DeviceEventEmitter.emit(Events.GALLERY_ACTIONS, action);
        if (action === 'none') {
            setDownloading(false);
        }
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: withTiming(dimensionsStyle.width, transformerTimingConfig),
            height: '100%',
        };
    }, [dimensionsStyle]);

    const subtitleStyle = useMemo(() => ({
        subtitlesFollowVideo: true,
        fontSize: width > height ? 14 : 12,
        paddingBottom: ANDROID_VIDEO_INSET + (width > height ? VIDEO_INSET : 0),
        paddingRight: 4,
        paddingLeft: 4,
    }), [width, height]);

    useEffect(() => {
        if (initialIndex === index && videoReady) {
            setPaused(false);
            hideControlsTimeoutRef.current = setTimeout(() => {
                setShowCustomControls(false);
            }, 1000);
        } else if (videoReady) {
            videoRef.current?.seek(0.4);
        }

    }, [index, initialIndex, videoReady]);

    useEffect(() => {
        if (!isPageActiveValue && !paused) {
            setShowCustomControls(true);
            setPaused(true);
        }
    }, [isPageActiveValue, paused]);

    useEffect(() => {
        return () => {
            const hideControlsTimeout = hideControlsTimeoutRef.current;
            const playbackStateDebounceTimeout = playbackStateDebounceTimeoutRef.current;
            const progressDebounceTimeout = progressDebounceTimeoutRef.current;

            if (hideControlsTimeout) {
                clearTimeout(hideControlsTimeout);
            }

            if (playbackStateDebounceTimeout) {
                clearTimeout(playbackStateDebounceTimeout);
            }

            if (progressDebounceTimeout) {
                clearTimeout(progressDebounceTimeout);
            }
        };
    }, []);

    return (
        <Animated.View style={animatedStyle}>
            {!hasError &&
            <>
                <Video

                    //@ts-expect-error legacy ref
                    ref={videoRef}
                    source={source}
                    paused={paused}
                    poster={poster}
                    onError={onError}
                    style={styles.video}
                    controls={false}
                    rate={playbackRate}
                    onProgress={onProgress}
                    onLoad={onLoad}
                    onPlaybackStateChanged={onPlaybackStateChanged}
                    onReadyForDisplay={onReadyForDisplay}
                    onEnd={onEnd}
                    resizeMode='none'
                    selectedTextTrack={captionsEnabled ? selected : {type: SelectedTrackType.DISABLED, value: ''}}
                    subtitleStyle={subtitleStyle}
                    playWhenInactive={true}
                />
                <VideoControls
                    visible={showCustomControls}
                    paused={paused}
                    currentTime={currentTime}
                    duration={duration}
                    speed={playbackRate}
                    isFullscreen={headerAndFooterHiddenValue}
                    onPlay={onPlay}
                    onPause={onPause}
                    onSeek={onSeek}
                    onRewind={onRewind}
                    onForward={onForward}
                    onSpeedChange={onRateChange}
                    onFullscreen={onFullscreenToggle}
                    onCaptionsToggle={onCaptionsPress}
                    hasCaptions={videoHasCaptions}
                    captionsEnabled={selected.type !== SelectedTrackType.DISABLED && captionsEnabled}
                    seekSeconds={seekSeconds}
                    setShowCustomControls={setShowCustomControls}
                />
            </>
            }
            {hasError &&
            <VideoError
                canDownloadFiles={canDownloadFiles}
                enableSecureFilePreview={enableSecureFilePreview}
                filename={item.name}
                isDownloading={downloading}
                isRemote={videoUri.startsWith('http')}
                hideHeaderAndFooter={hideHeaderAndFooter}
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
                enableSecureFilePreview={enableSecureFilePreview}
                item={item}
            />
            }
        </Animated.View>
    );
};

export default VideoRenderer;
