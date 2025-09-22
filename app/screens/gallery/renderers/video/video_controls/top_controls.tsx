// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View, Pressable} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets, type Edge} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {useWindowDimensions} from '@hooks/device';
import {translateYConfig} from '@hooks/gallery';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';
import {measureViewInWindow} from '@utils/gallery';

import {useViewPosition} from './context';
import {SpeedIcon, SubtitlesIcon} from './icons';

import type {VideoControlAction} from './types';

interface TopControlsProps extends VideoControlAction {
    captionsEnabled?: boolean;
    hasCaptions?: boolean;
    isFullscreen: boolean;
    onCaptionsToggle?: () => void;
    onFullscreen: () => void;
    onShowSpeedMenu: (value?: boolean) => void;
}

const rightControlsEdges: Edge[] = ['right'];

const getStyles = (isLandscape: boolean) => {
    return StyleSheet.create({
        container: {
            position: 'absolute',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            top: 0,
            left: 0,
            right: 0,
            paddingLeft: isLandscape ? 25 : 0,
            paddingRight: 0,
            zIndex: 3,
        },
        leftControls: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        rightControls: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
        },
        fullscreenIcon: {
            transform: [{rotate: '90deg'}],
        },
        button: {
            padding: 12,
            borderRadius: 8,
        },
    });
};

const TopControls: React.FC<TopControlsProps> = ({
    captionsEnabled,
    hasCaptions,
    handleControlAction,
    isFullscreen,
    onCaptionsToggle,
    onFullscreen,
    onShowSpeedMenu,
}) => {
    const speedButtonRef = useRef<View>(null);
    const {setViewPosition} = useViewPosition();
    const insets = useSafeAreaInsets();
    const {headerAndFooterHidden} = useLightboxSharedValues();
    const windowDimensions = useWindowDimensions();
    const headerHeight = useDefaultHeaderHeight();
    const styles = useMemo(() => getStyles(windowDimensions.width > windowDimensions.height), [windowDimensions]);

    const toggleFullscreen = useCallback(() => {
        handleControlAction('fullscreen', onFullscreen);
    }, [handleControlAction, onFullscreen]);

    const toggleCaptions = useCallback(() => {
        handleControlAction('captions', onCaptionsToggle);
    }, [handleControlAction, onCaptionsToggle]);

    const toggleSpeedMenu = useCallback(() => {
        handleControlAction('speed', onShowSpeedMenu);
    }, [handleControlAction, onShowSpeedMenu]);

    const animatedStyle = useAnimatedStyle(() => ({
        marginTop: withTiming(headerAndFooterHidden.value ? insets.top : headerHeight, translateYConfig),
    }));

    useEffect(() => {
        const measure = async () => {
            const result = await measureViewInWindow(speedButtonRef);
            setViewPosition({
                ref: speedButtonRef,
                x: result.x,
                y: result.y,
                width: result.width,
                height: result.height,
            });
        };

        measure();
    }, []);

    let fullscreen;
    if (isFullscreen) {
        fullscreen = (
            <CompassIcon
                name='arrow-collapse'
                size={26}
                color='white'
                style={styles.fullscreenIcon}
            />
        );
    } else {
        fullscreen = (
            <CompassIcon
                name='arrow-expand'
                size={26}
                color='white'
                style={styles.fullscreenIcon}
            />
        );
    }

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.leftControls}>
                <Pressable
                    style={styles.button}
                    onPress={toggleFullscreen}
                >
                    {fullscreen}
                </Pressable>
            </View>

            <SafeAreaView edges={rightControlsEdges}>
                <View style={styles.rightControls}>
                    {hasCaptions && (
                        <Pressable
                            style={styles.button}
                            onPress={toggleCaptions}
                        >
                            <SubtitlesIcon
                                size={24}
                                color='white'
                                selected={captionsEnabled}
                            />
                        </Pressable>
                    )}

                    <Pressable
                        style={styles.button}
                        onPress={toggleSpeedMenu}
                        ref={speedButtonRef}
                    >
                        <SpeedIcon
                            size={24}
                            color='white'
                        />
                    </Pressable>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
};

export default TopControls;
