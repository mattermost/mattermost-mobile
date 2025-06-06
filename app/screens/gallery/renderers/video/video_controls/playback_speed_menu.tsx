// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {StyleSheet, View, Pressable, Text, Platform, type LayoutChangeEvent} from 'react-native';
import Animated, {useAnimatedStyle, withSpring} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useWindowDimensions} from '@hooks/device';
import {measureViewInWindow} from '@utils/gallery';
import {typography} from '@utils/typography';

import {useViewPosition} from './context';
import SpeedOption from './speed_option';

import type {VideoControlAction} from './types';

interface PlaybackSpeedMenuProps extends VideoControlAction {
    currentSpeed: number;
    isFullscreen: boolean;
    onSpeedChange: (rate: number) => void;
    setShowSpeedMenu: React.Dispatch<React.SetStateAction<boolean>>;
    visible: boolean;
}

const styles = StyleSheet.create({
    iosMenu: {
        position: 'absolute',
        backgroundColor: 'rgba(28, 28, 30, 0.9)',
        borderRadius: 12,
        paddingVertical: 16,
    },
    iosHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 8,
        gap: 8,
    },
    iosTitle: {
        color: 'white',
        ...typography('Heading', 100, 'SemiBold'),
    },
    iosDone: {
        color: '#007AFF',
        ...typography('Body', 100, 'SemiBold'),
    },
    androidMenu: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 8,
        paddingVertical: 8,
        minWidth: 80,
        elevation: 8,
    },
});

const PlaybackRateMenu: React.FC<PlaybackSpeedMenuProps> = ({
    currentSpeed,
    handleControlAction,
    isFullscreen,
    onSpeedChange,
    setShowSpeedMenu,
    visible,
}) => {
    const {viewPosition, setViewPosition} = useViewPosition();
    const [menuSize, setMenuSize] = useState<{width: number; height: number}>({width: 0, height: 0});
    const windowDims = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const speedOptions = [0.5, 1.0, 1.5, 2.0];

    const animatedStyle = useAnimatedStyle(() => {
        // Calculate adjusted positions
        let left = viewPosition?.x ?? 0;
        const top = (viewPosition?.y ?? 0) + ((viewPosition?.height ?? 0) / 2);

        // Horizontal adjustment
        if (left + menuSize.width > windowDims.width) {
            left = windowDims.width - menuSize.width - (insets.right);
        }
        if (left < 0) {
            left = 10;
        }

        return {
            opacity: withSpring(visible ? 1 : 0),
            transform: [{
                scale: withSpring(visible ? 1 : 0.9),
            }],
            zIndex: 5,
            top,
            left,
        };
    });

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setMenuSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
        });
    }, []);

    const handleSpeedChange = useCallback((rate: number) => {
        handleControlAction('speed', () => {
            onSpeedChange(rate);
            setShowSpeedMenu(false);
        });
    }, [handleControlAction, onSpeedChange, setShowSpeedMenu]);

    const onClose = useCallback(() => {
        handleControlAction('closeSpeedMenu', () => {
            setShowSpeedMenu(false);
        });
    }, [handleControlAction, setShowSpeedMenu]);

    useEffect(() => {
        const measure = async () => {
            if (viewPosition) {
                const result = await measureViewInWindow(viewPosition.ref);
                setViewPosition({
                    ...viewPosition,
                    x: result.x,
                    y: result.y,
                    width: result.width,
                    height: result.height,
                });
            }
        };

        const measureTimeout = setTimeout(() => {
            measure();
        }, 150);

        return () => {
            clearTimeout(measureTimeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullscreen, visible, windowDims.width]);

    if (!visible || !viewPosition?.width) {
        return null;
    }

    let header;
    if (Platform.OS === 'ios') {
        header = (
            <View style={styles.iosHeader}>
                <Text style={styles.iosTitle}>
                    <FormattedMessage
                        id='video.playback_speed'
                        defaultMessage='Playback Speed'
                    />
                </Text>
                <Pressable onPress={onClose}>
                    <Text style={styles.iosDone}>
                        <FormattedMessage
                            id='video.done'
                            defaultMessage='Done'
                        />
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <Animated.View
            onLayout={onLayout}
            style={[Platform.select({android: styles.androidMenu, ios: styles.iosMenu}), animatedStyle]}
        >
            {header}
            {speedOptions.map((rate) => (
                <SpeedOption
                    key={rate}
                    rate={rate}
                    onSpeedChange={handleSpeedChange}
                    isSelected={currentSpeed === rate}
                />
            ))}
        </Animated.View>
    );
};

export default PlaybackRateMenu;
