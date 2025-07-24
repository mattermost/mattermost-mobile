// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    runOnJS,
    withTiming,
    interpolate,
    runOnUI,
} from 'react-native-reanimated';

interface ProgressBarProps {
    progress: number;
    duration: number;
    onSeek: (time: number) => void;
}

const styles = StyleSheet.create({
    container: {
        top: 4,
        marginBottom: 8,
        paddingHorizontal: 4,
        width: '100%',
        flex: 1,
    },
    touchArea: {
        height: 24,
        justifyContent: 'center',
        position: 'relative',
    },
    track: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        position: 'absolute',
        left: 0,
        right: 0,
    },
    bar: {
        backgroundColor: 'white',
        position: 'absolute',
        left: 0,
    },
    thumb: {
        position: 'absolute',
        backgroundColor: 'white',
        top: '50%',
        marginTop: -8,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
});

const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    duration,
    onSeek,
}) => {
    const progressRef = useRef<View>(null);
    const progressWidth = useSharedValue(0);
    const dragPosition = useSharedValue(0);
    const trackHeight = useSharedValue(4);
    const thumbOpacity = useSharedValue(0);
    const isDraggingShared = useSharedValue(false);
    const localProgress = useSharedValue(progress);
    const seekTimestamp = useSharedValue(0);

    React.useEffect(() => {
        runOnUI(() => {
            'worklet';
            if (!isDraggingShared.value) {
                localProgress.value = progress;
            }
        })();

    // no need to add shared values to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress]);

    const startDragging = () => {
        'worklet';
        isDraggingShared.value = true;
        trackHeight.value = withTiming(8, {duration: 150}); // Double height
        thumbOpacity.value = withTiming(1, {duration: 150});
    };

    const stopDragging = () => {
        isDraggingShared.value = false;
        trackHeight.value = withTiming(4, {duration: 150}); // Back to normal
        thumbOpacity.value = withTiming(0, {duration: 150});
        localProgress.value = progress;
    };

    const progressGesture = Gesture.Pan().
        minDistance(0).
        activeOffsetX([-5, 5]).
        onStart((event) => {
            startDragging();
            dragPosition.value = event.x;
        }).
        onUpdate((event) => {
            dragPosition.value = Math.max(0, Math.min(progressWidth.value, event.x));
            const newProgress = dragPosition.value / progressWidth.value;
            localProgress.value = newProgress;

            // Throttle the actual seeking to avoid too many calls
            const now = Date.now();
            const lastSeekTime = seekTimestamp.value;
            if (now - lastSeekTime > 100) {
                seekTimestamp.value = now;
                const newTime = newProgress * duration;
                runOnJS(onSeek)(newTime);
            }
        }).
        onEnd(() => {
            // Always seek to final position
            const finalProgress = dragPosition.value / progressWidth.value;
            const finalTime = finalProgress * duration;
            runOnJS(onSeek)(finalTime);
            runOnJS(stopDragging)();
        }).
        onFinalize(() => {
            // Ensure we stop dragging even if gesture is cancelled
            seekTimestamp.value = 0; // Reset timestamp
            runOnJS(stopDragging)();
        });

    const tapGesture = Gesture.Tap().
        onEnd((event) => {
            const newProgress = event.x / progressWidth.value;
            localProgress.value = newProgress;
            const newTime = newProgress * duration;
            runOnJS(onSeek)(newTime);
        });

    const combinedGesture = Gesture.Race(progressGesture, tapGesture);

    const trackStyle = useAnimatedStyle(() => ({
        height: trackHeight.value,
        borderRadius: trackHeight.value / 2,
    }));

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${localProgress.value * 100}%`,
        height: trackHeight.value,
        borderRadius: trackHeight.value / 2,
    }));

    const thumbStyle = useAnimatedStyle(() => {
        const currentProgress = isDraggingShared.value ? (dragPosition.value / progressWidth.value) : progress;

        return {
            opacity: thumbOpacity.value,
            transform: [{
                translateX: (currentProgress * progressWidth.value) - 8,
            }],

            // Scale thumb based on track height
            width: interpolate(trackHeight.value, [4, 8], [16, 20]),
            height: interpolate(trackHeight.value, [4, 8], [16, 20]),
            borderRadius: interpolate(trackHeight.value, [4, 8], [8, 10]),
        };
    });

    return (
        <View style={styles.container}>
            <GestureDetector gesture={combinedGesture}>
                <View
                    ref={progressRef}
                    style={styles.touchArea}
                    onLayout={(event) => {
                        progressWidth.value = event.nativeEvent.layout.width;
                    }}
                >
                    {/* Background track */}
                    <Animated.View style={[styles.track, trackStyle]}/>

                    {/* Progress bar */}
                    <Animated.View style={[styles.bar, progressBarStyle]}/>

                    {/* Thumb */}
                    <Animated.View style={[styles.thumb, thumbStyle]}/>
                </View>
            </GestureDetector>
        </View>
    );
};

export default ProgressBar;
