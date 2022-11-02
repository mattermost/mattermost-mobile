// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';
import Animated, {interpolate, useAnimatedStyle} from 'react-native-reanimated';

import CompassIcon from '@app/components/compass_icon';
import FormattedText from '@app/components/formatted_text';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    theme: Theme;
    isLastSlide: boolean;
    lastSlideIndex: number;
    nextSlideHandler: any;
    signInHandler: any;
    currentIndex: number;
    scrollX: Animated.SharedValue<number>;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    button: {
        marginTop: 5,
    },
    rowIcon: {
        color: theme.buttonColor,
        fontSize: 12,
        marginLeft: 5,
        marginTop: 2,
    },
}));

const AnimatedButton = Animated.createAnimatedComponent(Pressable);

const FooterButtons = ({
    theme,
    nextSlideHandler,
    signInHandler,
    isLastSlide,
    lastSlideIndex,
    currentIndex,
    scrollX,
}: Props) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const BUTTON_SIZE = 80;

    // keep in mind penultimate and ultimate slides to run buttons animations
    const isPenultimateSlide = currentIndex === (lastSlideIndex - 1);
    const needToAnimate = isLastSlide || isPenultimateSlide;

    const resizeStyle = useAnimatedStyle(() => {
        const interpolatedWidth = interpolate(
            scrollX.value,
            [(currentIndex - 1) * width, currentIndex * width, (currentIndex + 1) * width],
            [BUTTON_SIZE, isLastSlide ? width * 0.8 : BUTTON_SIZE, width * 0.8],
        );

        return {width: needToAnimate ? interpolatedWidth : BUTTON_SIZE};
    });

    const opacityTextStyle = useAnimatedStyle(() => {
        const interpolatedScale = interpolate(
            scrollX.value,
            [(currentIndex - 1) * width, currentIndex * width, (currentIndex + 1) * width],
            [isPenultimateSlide ? 1 : 0, 1, 0],
        );

        return {opacity: needToAnimate ? interpolatedScale : 1};
    });

    let mainButtonText = (
        <Animated.View style={[{flexDirection: 'row'}, opacityTextStyle]}>
            <FormattedText
                id='mobile.onboarding.next'
                defaultMessage='Next'
                style={buttonTextStyle(theme, 'm', 'primary', 'default')}
            />
            <CompassIcon
                name='arrow-forward-ios'
                style={styles.rowIcon}
            />
        </Animated.View>
    );

    let mainButtonAction = nextSlideHandler;

    if (isLastSlide) {
        mainButtonText = (
            <Animated.View style={[{flexDirection: 'row'}, opacityTextStyle]}>
                <FormattedText
                    id='mobile.onboarding.sign_in_to_get_started'
                    defaultMessage='Sign in to get started'
                    style={buttonTextStyle(theme, 's', 'primary', 'default')}
                />
            </Animated.View>
        );
        mainButtonAction = signInHandler;
    }

    return (
        <View style={{flexDirection: 'column', height: 150, marginTop: 15, width: '100%', marginHorizontal: 10, alignItems: 'center'}}>
            <AnimatedButton
                testID='mobile.onboaring.next'
                onPress={() => mainButtonAction()}
                style={[styles.button, buttonBackgroundStyle(theme, 'm', 'primary', 'default'), resizeStyle]}
            >
                {mainButtonText}
            </AnimatedButton>
            <Button
                testID='mobile.onboaring.sign_in'
                onPress={() => signInHandler()}
                containerStyle={[styles.button, buttonBackgroundStyle(theme, 'm', 'link', 'default')]}
            >
                <FormattedText
                    id='mobile.onboarding.sign_in'
                    defaultMessage='Sign in'
                    style={buttonTextStyle(theme, 's', 'primary', 'inverted')}
                />
            </Button>
        </View>
    );
};

export default FooterButtons;
