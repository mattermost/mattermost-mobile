// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet, type StyleProp, View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

type ProgressBarProps = {
    color: string;
    progress: number;
    style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
    container: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        overflow: 'hidden',
        width: '100%',
    },
    progressBar: {
        flex: 1,
    },
});

const ProgressBar = ({color, progress, style}: ProgressBarProps) => {
    const [width, setWidth] = useState(0);

    const progressValue = useSharedValue(progress);

    const progressAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {translateX: withTiming(((progressValue.value * 0.5) - 0.5) * width, {duration: 200})},
                {scaleX: withTiming(progressValue.value ? progressValue.value : 0.0001, {duration: 200})},
            ],
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
            onLayout={onLayout}
            style={[styles.container, style]}
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
    );
};

export default ProgressBar;
