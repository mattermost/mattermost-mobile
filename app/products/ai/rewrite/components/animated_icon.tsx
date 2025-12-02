// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';

type Props = {
    color: string;
    size?: number;
};

const AnimatedView = Animated.createAnimatedComponent(View);

const AnimatedAIIcon = ({color, size = 48}: Props) => {
    // Sparkle orbiting values
    const orbitProgress = useSharedValue(0);

    // Hand floating animation
    const handY = useSharedValue(0);

    // Create 3 sparkles orbiting
    const createSparkleStyle = (index: number, total: number) => {
        return useAnimatedStyle(() => {
            const angle = (orbitProgress.value + ((index / total) * 360)) * (Math.PI / 180);
            const radius = 40;

            // 3D orbit effect
            const x = Math.cos(angle) * radius;
            const y = (Math.sin(angle) * radius) * 0.5; // Flattened for 3D effect
            const z = Math.sin(angle); // For depth scaling

            // Scale based on Z position (closer = larger)
            const scale = 0.5 + ((z + 1) * 0.3);

            // Opacity based on Z position (farther = more transparent)
            const opacity = 0.3 + ((z + 1) * 0.35);

            return {
                transform: [
                    {translateX: x},
                    {translateY: y},
                    {scale},
                ],
                opacity,
            };
        });
    };

    const sparkle1Style = createSparkleStyle(0, 3);
    const sparkle2Style = createSparkleStyle(1, 3);
    const sparkle3Style = createSparkleStyle(2, 3);

    const handStyle = useAnimatedStyle(() => ({
        transform: [
            {translateY: handY.value},
        ],
    }));

    useEffect(() => {
        // Orbit animation (continuous 3D rotation)
        orbitProgress.value = withRepeat(
            withTiming(360, {duration: 4000, easing: Easing.linear}),
            -1,
            false,
        );

        // Hand floating animation (gentle up/down)
        handY.value = withRepeat(
            withSequence(
                withTiming(-5, {duration: 1500, easing: Easing.inOut(Easing.ease)}),
                withTiming(5, {duration: 1500, easing: Easing.inOut(Easing.ease)}),
            ),
            -1,
            true,
        );

        return () => {
            cancelAnimation(orbitProgress);
            cancelAnimation(handY);
        };
    }, [orbitProgress, handY]);

    const styles = StyleSheet.create({
        container: {
            width: 120,
            height: 120,
            justifyContent: 'center',
            alignItems: 'center',
        },
        handContainer: {
            position: 'absolute',
        },
        sparkleContainer: {
            position: 'absolute',
            width: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
    });

    return (
        <View style={styles.container}>
            {/* Sparkles orbiting */}
            <AnimatedView style={[styles.sparkleContainer, sparkle1Style]}>
                <CompassIcon
                    name='creation-outline'
                    size={16}
                    color={color}
                />
            </AnimatedView>
            <AnimatedView style={[styles.sparkleContainer, sparkle2Style]}>
                <CompassIcon
                    name='creation-outline'
                    size={16}
                    color={color}
                />
            </AnimatedView>
            <AnimatedView style={[styles.sparkleContainer, sparkle3Style]}>
                <CompassIcon
                    name='creation-outline'
                    size={16}
                    color={color}
                />
            </AnimatedView>

            {/* Hand in center */}
            <AnimatedView style={[styles.handContainer, handStyle]}>
                <CompassIcon
                    name='pencil-outline'
                    size={size}
                    color={color}
                />
            </AnimatedView>
        </View>
    );
};

export default AnimatedAIIcon;

