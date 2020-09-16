// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, LayoutChangeEvent, StyleSheet, StyleProp, View, ViewStyle} from 'react-native';

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
    const timer = useRef(new Animated.Value(progress)).current;
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const animation = Animated.timing(timer, {
            duration: 200,
            useNativeDriver: true,
            isInteraction: false,
            toValue: progress,
        });

        animation.start();

        return animation.stop;
    }, [progress]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width);
    }, []);

    const translateX = timer.interpolate({
        inputRange: [0, 1],
        outputRange: [(-0.5 * width), 0],
    });
    const scaleX = timer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.0001, 1],
    });

    return (
        <View
            onLayout={onLayout}
            style={[styles.container, style]}
        >
            <Animated.View
                style={[
                    styles.progressBar, {
                        backgroundColor: color,
                        width,
                        transform: [
                            {translateX},
                            {scaleX},
                        ],
                    },
                ]}
            />
        </View>
    );
};

export default ProgressBar;
