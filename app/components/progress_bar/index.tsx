// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {type LayoutChangeEvent, type StyleProp, View, type ViewStyle, StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type ProgressBarProps = {
    color: string;
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

const ProgressBar = ({color, progress, withCursor, style, onSeek}: ProgressBarProps) => {
    const theme = useTheme();
    const widthValue = useSharedValue(0);
    const progressValue = useSharedValue(progress);

    // eslint-disable-next-line new-cap
    const panGesture = Gesture.Pan().
        onChange((e) => {
            if (onSeek) {
                const seekPosition = e.x / widthValue.value;
                runOnJS(onSeek)(seekPosition);
            }
        });

    // eslint-disable-next-line new-cap
    const tapGesture = Gesture.Tap().
        onEnd((e) => {
            if (onSeek) {
                const seekPosition = e.x / widthValue.value;
                runOnJS(onSeek)(seekPosition);
            }
        });

    // eslint-disable-next-line new-cap
    const composedGestures = Gesture.Race(tapGesture, panGesture);

    const progressAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {translateX: withTiming(((progressValue.value * 0.5) - 0.5) * widthValue.value, {duration: 200})},
                {scaleX: withTiming(progressValue.value ? progressValue.value : 0.0001, {duration: 200})},
            ],
            width: widthValue.value,
        };
    });

    const cursorAnimatedStyle = useAnimatedStyle(() => {
        const cursorWidth = 15;
        return {
            left: withTiming((progressValue.value * widthValue.value) - (cursorWidth / 2), {duration: 200}),
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
                onTouchStart={(e) => e.stopPropagation}
                style={styles.container}
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
