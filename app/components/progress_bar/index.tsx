// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {type LayoutChangeEvent, type StyleProp, View, type ViewStyle, StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {clamp, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type ProgressBarProps = {
    color: string;
    containerStyle?: StyleProp<ViewStyle>;
    progress: number;
    withCursor?: boolean;
    style?: StyleProp<ViewStyle>;
    onSeek?: (position: number) => void;
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    progressBarContainer: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        width: '100%',
    },
    progressBar: {
        flex: 1,
    },
    cursor: {
        position: 'absolute',
        borderRadius: 100,
        width: 15,
        height: 15,
    },
});

const START_CURSOR_VALUE = 0;
const END_CURSOR_VALUE = 1;

const ProgressBar = ({color, containerStyle, progress, withCursor, style, onSeek}: ProgressBarProps) => {
    const theme = useTheme();
    const widthValue = useSharedValue(0);
    const progressValue = useSharedValue(progress);
    const isGestureActive = useSharedValue(false);

    const panGesture = Gesture.Pan().
        onStart(() => {
            isGestureActive.value = true;
        }).
        onChange((e) => {
            if (onSeek) {
                const clampedSeekPosition = clamp(e.x / widthValue.value, START_CURSOR_VALUE, END_CURSOR_VALUE);
                runOnJS(onSeek)(clampedSeekPosition);
            }
        }).
        onEnd(() => {
            isGestureActive.value = false;
        }).
        onFinalize(() => {
            isGestureActive.value = false;
        });

    const tapGesture = Gesture.Tap().
        onStart(() => {
            isGestureActive.value = true;
        }).
        onEnd((e) => {
            if (onSeek) {
                const clampedSeekPosition = clamp(e.x / widthValue.value, START_CURSOR_VALUE, END_CURSOR_VALUE);
                runOnJS(onSeek)(clampedSeekPosition);
            }
            isGestureActive.value = false;
        }).
        onFinalize(() => {
            isGestureActive.value = false;
        });

    const composedGestures = Gesture.Race(tapGesture, panGesture);

    const progressAnimatedStyle = useAnimatedStyle(() => {
        const translateX = ((progressValue.value * 0.5) - 0.5) * widthValue.value;
        const scaleX = progressValue.value ? progressValue.value : 0.0001;

        return {
            transform: [
                {translateX: isGestureActive.value ? translateX : withTiming(translateX, {duration: 200})},
                {scaleX: isGestureActive.value ? scaleX : withTiming(scaleX, {duration: 200})},
            ],
            width: widthValue.value,
        };
    });

    const cursorAnimatedStyle = useAnimatedStyle(() => {
        const cursorWidth = 15;
        const leftPosition = (progressValue.value * widthValue.value) - (cursorWidth / 2);

        return {
            left: isGestureActive.value ? leftPosition : withTiming(leftPosition, {duration: 100}),
        };
    });

    useEffect(() => {
        progressValue.value = progress;
    }, [progress]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        widthValue.value = e.nativeEvent.layout.width;
    }, []);

    return (
        <GestureDetector gesture={composedGestures}>
            <View
                onTouchStart={(e) => e.stopPropagation()}
                style={[styles.container, containerStyle]}
            >
                <View
                    onLayout={onLayout}
                    style={[
                        styles.progressBarContainer,
                        {
                            backgroundColor: withCursor ? changeOpacity(theme.centerChannelColor, 0.2) : 'rgba(255, 255, 255, 0.16)',
                        },
                        style,
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                backgroundColor: color,
                            },
                            progressAnimatedStyle,
                        ]}
                    />
                </View>

                {withCursor &&
                <Animated.View
                    style={[
                        styles.cursor,
                        {
                            backgroundColor: color,
                        },
                        cursorAnimatedStyle,
                    ]}
                />}
            </View>
        </GestureDetector>
    );
};

export default ProgressBar;
