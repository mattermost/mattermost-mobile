// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

import {useTheme} from '@context/theme';

interface StreamingIndicatorProps {
    precontent?: boolean; // Show before any content arrives
}

/**
 * Animated indicator shown while agent is generating a response
 * Shows a pulsing cursor for mobile-optimized UX
 */
const StreamingIndicator = ({precontent = false}: StreamingIndicatorProps) => {
    const theme = useTheme();
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Continuous pulsing animation
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
        );

        animation.start();

        return () => animation.stop();
    }, [pulseAnim]);

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.cursor,
                    {
                        backgroundColor: theme.centerChannelColor,
                        opacity,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        minHeight: 20,
    },
    cursor: {
        width: 2,
        height: 16,
        borderRadius: 1,
        marginLeft: 2,
    },
});

export default StreamingIndicator;
