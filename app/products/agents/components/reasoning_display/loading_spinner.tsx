// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

/**
 * Animated loading spinner for reasoning generation
 * Shows a rotating circular indicator
 */
const LoadingSpinner = () => {
    const theme = useTheme();
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Continuous rotation animation
        const animation = Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        );

        animation.start();

        return () => animation.stop();
    }, [spinAnim]);

    const rotate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.spinner,
                    {
                        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
                        borderTopColor: changeOpacity(theme.centerChannelColor, 0.64),
                        transform: [{rotate}],
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 14,
        height: 14,
    },
    spinner: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderStyle: 'solid',
    },
});

export default LoadingSpinner;
