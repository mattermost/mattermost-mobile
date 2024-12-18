// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {Easing, interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {OPTIONS_HEIGHT} from '.';

type OptionBoxProps = {
    animatedBackgroundColor: string;
    animatedColor: string;
    animatedIconName: string;
    animatedText: string;
    iconName: string;
    onAnimationEnd?: () => void;
    onPress: () => void;
    testID?: string;
    text: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        borderRadius: 4,
        flex: 1,
        maxHeight: OPTIONS_HEIGHT,
        minWidth: 60,
    },
    background: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingHorizontal: 5,
        textTransform: 'capitalize',
        ...typography('Body', 50, 'SemiBold'),
    },
}));

const AnimatedOptionBox = ({
    animatedBackgroundColor, animatedColor, animatedIconName, animatedText,
    iconName, onAnimationEnd, onPress, testID, text,
}: OptionBoxProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [activated, setActivated] = useState(false);
    const animate = useSharedValue(0);

    const handleOnPress = useCallback(() => {
        animate.value = withTiming(1, {duration: 150, easing: Easing.out(Easing.linear)});
        setActivated(true);
        onPress();
    }, [animate, onPress]);

    const backgroundStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            animate.value,
            [0, 1],
            ['transparent', animatedBackgroundColor],
        ),
    }));

    const optionStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            animate.value,
            [0, 1],
            [1, 0],
        ),
    }));

    const scaleStyle = useAnimatedStyle(() => ({
        transform: [{
            scale: interpolate(
                animate.value,
                [0, 1],
                [0.25, 1],
            ),
        }],
        opacity: animate.value,
    }), [activated]);

    useEffect(() => {
        let t: NodeJS.Timeout|undefined;
        const callback = () => {
            'worklet';
            if (onAnimationEnd) {
                runOnJS(onAnimationEnd)();
            }
        };

        if (activated) {
            t = setTimeout(() => {
                setActivated(false);
                animate.value = withTiming(0, {duration: 150, easing: Easing.out(Easing.linear)}, callback);
            }, 1200);
        }

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [activated, animate, onAnimationEnd]);

    return (
        <AnimatedPressable
            onPress={handleOnPress}
            disabled={activated}
            style={styles.container}
            testID={testID}
        >
            {({pressed}) => (
                <View style={[styles.container, styles.background, pressed && {backgroundColor: changeOpacity(theme.buttonBg, 0.16)}]}>
                    <Animated.View style={[styles.container, backgroundStyle]}>
                        <Animated.View style={[StyleSheet.absoluteFill, styles.center, optionStyle]}>
                            <CompassIcon
                                color={pressed ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56)}
                                name={iconName}
                                size={24}
                            />
                            <Text
                                numberOfLines={1}
                                style={[styles.text, {color: pressed ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56)}]}
                                testID={`${testID}.label`}
                            >
                                {text}
                            </Text>
                        </Animated.View>
                        <Animated.View style={[StyleSheet.absoluteFill, styles.center, scaleStyle]}>
                            <CompassIcon
                                color={animatedColor}
                                name={animatedIconName}
                                size={24}
                            />
                            <Text
                                numberOfLines={1}
                                style={[styles.text, {color: animatedColor}]}
                                testID={`${testID}.animated`}
                            >
                                {animatedText}
                            </Text>
                        </Animated.View>
                    </Animated.View>
                </View>
            )}
        </AnimatedPressable>
    );
};

export default AnimatedOptionBox;
