// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {type LayoutChangeEvent, type StyleProp, View, type ViewStyle, StyleSheet, PanResponder} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

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
    const [width, setWidth] = useState(0);

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            const seekPosition = evt.nativeEvent.locationX / width;
            onSeek?.(seekPosition);
        },
        onPanResponderMove: (evt) => {
            const seekPosition = evt.nativeEvent.locationX / width;
            onSeek?.(seekPosition);
        },
    })).current;

    const progressValue = useSharedValue(progress);

    const progressAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {translateX: withTiming(((progressValue.value * 0.5) - 0.5) * width, {duration: 200})},
                {scaleX: withTiming(progressValue.value ? progressValue.value : 0.0001, {duration: 200})},
            ],
        };
    }, [width]);

    const cursorAnimatedStyle = useAnimatedStyle(() => {
        const cursorWidth = 15;
        return {
            left: withTiming((progressValue.value * width) - (cursorWidth / 2), {duration: 200}),
        };
    }, [width]);

    useEffect(() => {
        progressValue.value = progress;
    }, [progress]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width);
    }, []);

    return (
        <View
            style={styles.container}
            {...panResponder.panHandlers}
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
                            width,
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
    );
};

export default ProgressBar;
