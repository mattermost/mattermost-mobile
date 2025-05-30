// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {Extrapolate, interpolate, useAnimatedStyle} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {ONBOARDING_CONTENT_MAX_WIDTH} from '@screens/onboarding/slide';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';

type Props = {
    theme: Theme;
    lastSlideIndex: number;
    nextSlideHandler: () => void;
    signInHandler: () => void;
    scrollX: Animated.SharedValue<number>;
};

const styles = StyleSheet.create({
    button: {
        marginTop: 5,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButtonText: {
        flexDirection: 'row',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: 120,
        gap: 5,
    },
    footerButtonsContainer: {
        flexDirection: 'column',
        height: 120,
        marginTop: 25,
        marginBottom: 15,
        width: '100%',
        alignItems: 'center',
    },
});

const AnimatedButton = Animated.createAnimatedComponent(Pressable);
const BUTTON_SIZE = 120;

const FooterButtons = ({
    theme,
    nextSlideHandler,
    signInHandler,
    lastSlideIndex,
    scrollX,
}: Props) => {
    const {width} = useWindowDimensions();
    const buttonWidth = Math.min(width * 0.8, ONBOARDING_CONTENT_MAX_WIDTH);

    // keep in mind penultimate and ultimate slides to run buttons text/opacity/size animations
    const penultimateSlide = lastSlideIndex - 1;

    const inputRange = [(penultimateSlide * width), lastSlideIndex * width];

    // the next button must resize in the last slide to be the 80% wide of the screen with animation
    const resizeStyle = useAnimatedStyle(() => {
        const interpolatedWidth = interpolate(
            scrollX.value,
            inputRange,
            [BUTTON_SIZE, buttonWidth],
            Extrapolate.CLAMP,
        );

        return {width: interpolatedWidth};
    });

    // use for the opacity of the button text in the penultimate and last slide
    const opacityNextTextStyle = useAnimatedStyle(() => {
        const interpolatedScale = interpolate(
            scrollX.value,
            [penultimateSlide * width, ((penultimateSlide * width) + (width / 2))],
            [1, 0], // from last to penultimate it must fade out (from 1 to 0), once it starts getting the penultimate range it must fade in again (from 0 to 1)
            Extrapolate.CLAMP,
        );

        return {opacity: interpolatedScale};
    });

    const opacitySignInTextStyle = useAnimatedStyle(() => {
        const interpolatedScale = interpolate(
            scrollX.value,
            [lastSlideIndex * width, ((penultimateSlide * width) + (width / 2))],
            [1, 0], // from last to penultimate it must fade out (from 1 to 0), once it starts getting the penultimate range it must fade in again (from 0 to 1)
            Extrapolate.CLAMP,
        );

        return {opacity: interpolatedScale};
    });

    // the sign in button should fade out until dissappear in the last slide
    const opacitySignInButton = useAnimatedStyle(() => {
        const interpolatedScale = interpolate(
            scrollX.value,
            inputRange,
            [1, 0],
            Extrapolate.CLAMP,
        );

        return {opacity: interpolatedScale};
    });

    const textStyles = StyleSheet.flatten(buttonTextStyle(theme, 'lg', 'primary', 'default'));

    const nextButtonText = (
        <Animated.View style={[styles.nextButtonText, opacityNextTextStyle]}>
            <FormattedText
                id='mobile.onboarding.next'
                defaultMessage='Next'
                style={buttonTextStyle(theme, 'lg', 'primary', 'default')}
            />
            <CompassIcon
                name='arrow-forward-ios'
                size={12}
                color={textStyles.color}
            />
        </Animated.View>
    );

    const signInButtonText = (
        <Animated.View style={opacitySignInTextStyle}>
            <FormattedText
                id='mobile.onboarding.sign_in_to_get_started'
                defaultMessage='Sign in to get started'
                style={buttonTextStyle(theme, 'lg', 'primary', 'default')}
            />
        </Animated.View>
    );

    return (
        <View style={styles.footerButtonsContainer}>
            <AnimatedButton
                testID='mobile.onboaring.next'
                onPress={nextSlideHandler}
                style={[styles.button, buttonBackgroundStyle(theme, 'lg', 'primary', 'default'), resizeStyle]}
            >
                {nextButtonText}
                {signInButtonText}
            </AnimatedButton>
            <AnimatedButton
                testID='mobile.onboaring.sign_in'
                onPress={signInHandler}
                style={[styles.button, buttonBackgroundStyle(theme, 'lg', 'link', 'default'), opacitySignInButton]}
            >
                <FormattedText
                    id='mobile.onboarding.sign_in'
                    defaultMessage='Sign in'
                    style={buttonTextStyle(theme, 'lg', 'primary', 'inverted')}
                />
            </AnimatedButton>
        </View>
    );
};

export default FooterButtons;
