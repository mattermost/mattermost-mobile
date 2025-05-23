// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, StyleSheet} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Video, {SelectedTrackType, type OnPlaybackStateChangedData, type ReactVideoPoster, type ReactVideoSource, type VideoRef} from 'react-native-video';

import {updateLocalFilePath} from '@actions/local/file';
import {CaptionsEnabledContext} from '@calls/context';
import {getTranscriptionUri} from '@calls/utils';
import {Events} from '@constants';
import {GALLERY_FOOTER_HEIGHT, VIDEO_INSET} from '@constants/gallery';
import {useServerUrl} from '@context/server';
import {transformerTimingConfig} from '@screens/gallery/animation_config/timing';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';

import VideoError from './error';

import type {GalleryAction, GalleryPagerItem} from '@typings/screens/gallery';

interface VideoRendererProps extends GalleryPagerItem {
    index: number;
    initialIndex: number;
    hideHeaderAndFooter: (hide?: boolean) => void;
}

const styles = StyleSheet.create({
    video: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
});

function useStateFromSharedValue<T>(sharedValue: SharedValue<T> | undefined, defaultValue: T): T {
    const [state, setState] = useState(sharedValue?.value ?? defaultValue);
    useAnimatedReaction(
        () => sharedValue?.value,
        (currentValue, previousValue) => {
            if (currentValue !== previousValue) {
                runOnJS(setState)(currentValue ?? defaultValue);
            }
        },
    );
    return state;
}

function useMemoFromSharedValue<T, R>(
    sharedValue: SharedValue<T>,
    computeFn: (value: T) => R,
    dependencies: React.DependencyList,
): R {
    const [reactValue, setReactValue] = useState(sharedValue.value);

    useAnimatedReaction(
        () => sharedValue.value,
        (currentValue, previousValue) => {
            if (currentValue !== previousValue) {
                runOnJS(setReactValue)(currentValue);
            }
        },
    );

    const memoizedValue = useMemo(() => computeFn(reactValue), [computeFn, reactValue, ...dependencies]);
    return memoizedValue;
}

const VideoRenderer = ({height, index, initialIndex, item, isPageActive, isPagerInProgress, hideHeaderAndFooter, width}: VideoRendererProps) => {
    const {headerAndFooterHidden} = useLightboxSharedValues();
    const fullscreen = useSharedValue(false);
    const {bottom} = useSafeAreaInsets();
    const serverUrl = useServerUrl();
    const videoRef = useRef<VideoRef>();
    const captionsEnabled = useContext(CaptionsEnabledContext);
    const [paused, setPaused] = useState(!(initialIndex === index));
    const [videoReady, setVideoReady] = useState(false);
    const [videoUri, setVideoUri] = useState(item.uri);
    const [downloading, setDownloading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const {tracks, selected} = useMemo(() => getTranscriptionUri(serverUrl, item.postProps), [serverUrl, item.postProps]);
    const source: ReactVideoSource = useMemo(() => ({uri: videoUri, textTracks: tracks}), [videoUri, tracks]);
    const poster: ReactVideoPoster = useMemo(() => ({
        source: {uri: item.posterUri},
        resizeMode: 'contain',
    }), [item.posterUri]);

    const isPageActiveValue = useStateFromSharedValue(isPageActive, false);
    const isPagerInProgressValue = useStateFromSharedValue(isPagerInProgress, false);
    const headerAndFooterHiddenValue = useStateFromSharedValue(headerAndFooterHidden, false);

    const setFullscreen = useCallback((value: boolean) => {
        fullscreen.value = value;
    }, []);

    const onDownloadSuccess = (path: string) => {
        setVideoUri(path);
        setHasError(false);
        updateLocalFilePath(serverUrl, item.id, path);
    };

    const onEnd = useCallback(() => {
        setFullscreen(false);
        hideHeaderAndFooter(true);
        setPaused(true);
        videoRef.current?.dismissFullscreenPlayer();
    }, [hideHeaderAndFooter, setFullscreen]);

    const onError = useCallback(() => {
        setHasError(true);
    }, []);

    const onPlaybackStateChanged = useCallback(() => {
        let debounceTimeout: NodeJS.Timeout | null = null;

        return ({isPlaying}: OnPlaybackStateChangedData) => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            debounceTimeout = setTimeout(() => {
                if (isPageActiveValue) {
                    hideHeaderAndFooter(isPlaying);
                    setPaused(!isPlaying);
                }
            }, 200);
        };

    }, [isPageActiveValue, hideHeaderAndFooter])();

    const onReadyForDisplay = useCallback(() => {
        setVideoReady(true);
        setHasError(false);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!isPagerInProgressValue && paused) {
            hideHeaderAndFooter(!headerAndFooterHiddenValue);

        }
    }, [headerAndFooterHiddenValue, isPagerInProgressValue, paused, hideHeaderAndFooter]);

    const setGalleryAction = useCallback((action: GalleryAction) => {
        DeviceEventEmitter.emit(Events.GALLERY_ACTIONS, action);
        if (action === 'none') {
            setDownloading(false);
        }
    }, []);

    const dimensionsStyle = useMemoFromSharedValue(
        headerAndFooterHidden,
        (isHidden) => {
            const w = width;
            const insets = isHidden && Platform.OS === 'ios' ? 0 : VIDEO_INSET + GALLERY_FOOTER_HEIGHT + Platform.select({default: 0, android: 20});
            const h = height - (insets + bottom);

            return {width: w, height: h};
        }, [width, height, bottom]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: withTiming(dimensionsStyle.width, transformerTimingConfig),
            height: withTiming(dimensionsStyle.height, transformerTimingConfig),
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
        if (!isPageActiveValue && !paused) {
            setPaused(true);
            videoRef.current?.dismissFullscreenPlayer();
        }
    }, [isPageActiveValue, paused]);

    return (
        <Animated.View style={animatedStyle}>
            <Video

                //@ts-expect-error legacy ref
                ref={videoRef}
                source={source}
                paused={paused}
                poster={poster}
                onError={onError}
                style={[styles.video, dimensionsStyle]}
                controls={true}
                onPlaybackStateChanged={onPlaybackStateChanged}
                onReadyForDisplay={onReadyForDisplay}
                onEnd={onEnd}
                onTouchEnd={handleTouchEnd}
                resizeMode='none'
                selectedTextTrack={captionsEnabled[index] ? selected : {type: SelectedTrackType.DISABLED, value: ''}}
            />
            {hasError &&
            <VideoError
                filename={item.name}
                isDownloading={downloading}
                isRemote={videoUri.startsWith('http')}
                handleTouchEnd={handleTouchEnd}
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
