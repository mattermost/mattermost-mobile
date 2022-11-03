// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, useWindowDimensions} from 'react-native';
import Animated, {Extrapolate, interpolate, useAnimatedStyle} from 'react-native-reanimated';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {OnboardingItem} from './slides_data';

type Props = {
    item: OnboardingItem;
    theme: Theme;
    scrollX: Animated.SharedValue<number>;
    index: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        fontWeight: '600',
        marginBottom: 5,
        height: 100,
        color: theme.centerChannelColor,
        textAlign: 'center',
    },
    fontTitle: {
        fontSize: 40,
    },
    fontFirstTitle: {
        fontSize: 66,
    },
    description: {
        fontWeight: '400',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        height: 80,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'Regular'),
    },
    image: {
        justifyContent: 'center',
        height: 60,
        maxHeight: 180,
        width: 60,
    },
    itemContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

const SlideItem = ({theme, item, scrollX, index}: Props) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const SvgImg = item.image;

    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const translateImage = useAnimatedStyle(() => {
        const translateImageInterpolate = interpolate(
            scrollX.value,
            inputRange,
            [width * 2, 0, -width * 2],
            Extrapolate.CLAMP,
        );

        return {
            transform: [{
                translateX: translateImageInterpolate,
            }],
        };
    });

    const translateTitle = useAnimatedStyle(() => {
        const translateTitleInterpolate = interpolate(
            scrollX.value,
            inputRange,
            [width * 0.6, 0, -width * 0.6],
            Extrapolate.CLAMP,
        );

        return {
            transform: [{
                translateX: translateTitleInterpolate,
            }],
        };
    });

    const translateDescription = useAnimatedStyle(() => {
        const translateDescriptionInterpolate = interpolate(
            scrollX.value,
            inputRange,
            [width * 0.2, 0, -width * 0.2],
            Extrapolate.CLAMP,
        );

        return {
            transform: [{
                translateX: translateDescriptionInterpolate,
            }],
        };
    });

    const opacity = useAnimatedStyle(() => {
        const opacityInterpolate = interpolate(
            scrollX.value,
            inputRange,
            [0.2, 1, 0.2],
            Extrapolate.CLAMP,
        );

        return {opacity: opacityInterpolate};
    });

    return (
        <View style={[styles.itemContainer, {width}]}>
            <Animated.View
                style={[translateImage]}
            >
                <SvgImg
                    style={[styles.image, {
                        width,
                        resizeMode: 'contain',
                    }]}
                />
            </Animated.View>
            <View style={{flex: 0.3}}>
                <Animated.Text
                    style={[styles.title, (index === 0 ? styles.fontFirstTitle : styles.fontTitle), translateTitle, opacity]}
                >
                    {item.title}
                </Animated.Text>
                <Animated.Text
                    style={[styles.description, translateDescription, opacity]}
                >
                    {item.description}
                </Animated.Text>
            </View>
        </View>
    );
};

export default SlideItem;
