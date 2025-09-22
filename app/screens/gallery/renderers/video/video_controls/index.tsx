// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming, type SharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useDefaultHeaderHeight} from '@hooks/header';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';

import BottomControls from './bottom_controls';
import {ViewPositionProvider} from './context';
import PlaybackControls from './playback_controls';
import PlaybackSpeedMenu from './playback_speed_menu';
import TopControls from './top_controls';

interface VideoControlsWithSeekProps {
    visible: boolean;
    paused: boolean;
    currentTime: SharedValue<number>;
    duration: number;
    speed: number;
    captionsEnabled?: boolean;
    hasCaptions?: boolean;
    isFullscreen: boolean;
    seekSeconds: 0 | 10 | 30;
    onPlay: () => void;
    onPause: () => void;
    onSeek: (time: number) => void;
    onRewind: () => void;
    onForward: () => void;
    onSpeedChange: (rate: number) => void;
    onFullscreen: () => void;
    onCaptionsToggle?: () => void;
    setShowCustomControls: React.Dispatch<React.SetStateAction<boolean>>;
}

type Control = 'play' | 'pause' | 'seek' | 'rewind' | 'forward' | 'selectSpeed' | 'closeSpeedMenu' | 'speed' | 'fullscreen' | 'captions';

const persistentControls = new Set<Control>(['pause', 'selectSpeed']);

const SHOW_CONTROLS_TIMEOUT = 4000; // 4 seconds

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
    },
    controlsBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    controlsArea: {
        flex: 1,
        justifyContent: 'space-between',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});

const VideoControls: React.FC<VideoControlsWithSeekProps> = ({
    paused,
    currentTime,
    duration,
    speed,
    onPlay,
    onPause,
    onSeek,
    onRewind,
    onForward,
    onSpeedChange,
    onFullscreen,
    onCaptionsToggle,
    captionsEnabled,
    hasCaptions = false,
    isFullscreen,
    seekSeconds,
    visible,
    setShowCustomControls,
}) => {
    const insets = useSafeAreaInsets();
    const headerHeight = useDefaultHeaderHeight();
    const {headerAndFooterHidden} = useLightboxSharedValues();

    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    const isInteractingWithControlsRef = useRef(false);
    const isInteractingWithControlsTimeoutRef = useRef<NodeJS.Timeout>();
    const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();

    const cancelHideControls = useCallback(() => {
        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
            hideControlsTimeoutRef.current = undefined;
        }

        if (isInteractingWithControlsTimeoutRef.current) {
            clearTimeout(isInteractingWithControlsTimeoutRef.current);
            isInteractingWithControlsTimeoutRef.current = undefined;
        }
    }, []);

    const scheduleAutoHideControls = useCallback((control?: Control, delay: number = SHOW_CONTROLS_TIMEOUT) => {
        if (!paused || control === 'play') {
            hideControlsTimeoutRef.current = setTimeout(() => {
                setShowCustomControls(false);
                setShowSpeedMenu(false);
            }, delay);
        }
    }, [paused, setShowCustomControls]);

    const handleControlAction = useCallback((control: Control, action?: () => void) => {
        if (!visible) {
            return;
        }

        cancelHideControls();
        isInteractingWithControlsRef.current = true;
        action?.();

        isInteractingWithControlsTimeoutRef.current = setTimeout(() => {
            isInteractingWithControlsRef.current = false;
        }, 300);

        if (persistentControls.has(control)) {
            // If the control is persistent, do not hide controls
            return;
        }

        scheduleAutoHideControls(control);
    }, [cancelHideControls, scheduleAutoHideControls, visible]);

    const handleBackgroundPress = useCallback(() => {
        if (isInteractingWithControlsRef.current) {
            // If the user is interacting with the controls, do not hide them
            return;
        }

        cancelHideControls();

        if (visible) {
            setShowCustomControls(false);
            setShowSpeedMenu(false);
        } else {
            setShowCustomControls(true);
            scheduleAutoHideControls();
        }
    }, [cancelHideControls, scheduleAutoHideControls, setShowCustomControls, visible]);

    const onShowSpeedMenu = useCallback((value?: boolean) => {
        setShowSpeedMenu(value || !showSpeedMenu);
    }, [showSpeedMenu]);

    const containerStyle = useAnimatedStyle(() => ({
        paddingTop: headerAndFooterHidden.value ? insets.top : headerHeight,
    }), [headerHeight, insets.left, insets.right]);

    const controlsOpacityStyle = useAnimatedStyle(() => ({
        opacity: withTiming(visible ? 1 : 0, {duration: 300}),
    }));

    useEffect(() => {
        return () => {
            cancelHideControls();
        };
    }, [cancelHideControls]);

    return (
        <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
            <Animated.View style={[styles.container, controlsOpacityStyle]}>
                <ViewPositionProvider>
                    <View
                        onTouchEnd={handleBackgroundPress}
                        style={[styles.controlsArea, styles.controlsBackground]}
                    >

                        <TopControls
                            captionsEnabled={captionsEnabled}
                            handleControlAction={handleControlAction}
                            hasCaptions={hasCaptions}
                            isFullscreen={isFullscreen}
                            onFullscreen={onFullscreen}
                            onCaptionsToggle={onCaptionsToggle}
                            onShowSpeedMenu={onShowSpeedMenu}
                        />

                        <PlaybackControls
                            handleControlAction={handleControlAction}
                            paused={paused}
                            seekSeconds={seekSeconds}
                            onPlay={onPlay}
                            onPause={onPause}
                            onRewind={onRewind}
                            onForward={onForward}
                        />

                        <BottomControls
                            currentTime={currentTime}
                            duration={duration}
                            handleControlAction={handleControlAction}
                            onSeek={onSeek}
                            paddingBottom={isFullscreen ? 0 : insets.bottom}
                        />

                        <PlaybackSpeedMenu
                            visible={showSpeedMenu}
                            currentSpeed={speed}
                            handleControlAction={handleControlAction}
                            isFullscreen={isFullscreen}
                            onSpeedChange={onSpeedChange}
                            setShowSpeedMenu={setShowSpeedMenu}
                        />
                    </View>
                </ViewPositionProvider>
            </Animated.View>
        </Animated.View>
    );
};

export default VideoControls;
