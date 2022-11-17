// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {View, useWindowDimensions} from 'react-native';
import Animated, {Extrapolate, interpolate, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {OnboardingItem} from '@typings/screens/onboarding';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    item: OnboardingItem;
    theme: Theme;
    scrollX: Animated.SharedValue<number>;
    index: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    image: {
        justifyContent: 'center',
        maxHeight: 180,
    },
    title: {
        height: 100,
        color: theme.centerChannelColor,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    fontTitle: {
        marginTop: 32,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    fontFirstTitle: {
        ...typography('Heading', 1200, 'SemiBold'),
        paddingTop: 40,
    },
    widthLastSlide: {
        paddingHorizontal: 50,
    },
    firstSlideInitialPosition: {
        left: 200,
        opacity: 0,
    },
    description: {
        textAlign: 'center',
        paddingHorizontal: 20,
        height: 80,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'Regular'),
    },
    itemContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

const FIRST_SLIDE = 0;
const LAST_SLIDE = 3;
const FIRST_LOAD_ELEMENTS_POSITION = 400;

const SlideItem = ({theme, item, scrollX, index}: Props) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);

    /**
     * Code used to animate the first image load
     */
    const [firstLoad, setFirstLoad] = useState(true);

    const initialImagePosition = useSharedValue(FIRST_LOAD_ELEMENTS_POSITION);
    const initialTitlePosition = useSharedValue(FIRST_LOAD_ELEMENTS_POSITION);
    const initialDescriptionPosition = useSharedValue(FIRST_LOAD_ELEMENTS_POSITION);

    const initialElementsOpacity = useSharedValue(0);

    useEffect(() => {
        if (index === FIRST_SLIDE) {
            initialImagePosition.value = withTiming(0, {duration: 600});
            initialTitlePosition.value = withTiming(0, {duration: 800});
            initialDescriptionPosition.value = withTiming(0, {duration: 1000});

            initialElementsOpacity.value = withTiming(1, {duration: 1000});
            setFirstLoad(false);
        }
    }, []);

    const translateFirstImageOnLoad = useAnimatedStyle(() => {
        return {
            transform: [{
                translateX: initialImagePosition.value,
            }],
            opacity: initialElementsOpacity.value,
        };
    });

    const translateFirstTitleOnLoad = useAnimatedStyle(() => {
        return {
            transform: [{
                translateX: initialTitlePosition.value,
            }],
            opacity: initialElementsOpacity.value,
        };
    });

    const translateFirstDescriptionOnLoad = useAnimatedStyle(() => {
        return {
            transform: [{
                translateX: initialDescriptionPosition.value,
            }],
            opacity: initialElementsOpacity.value,
        };
    });// end of code for animating first image load

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
                style={[
                    styles.image,
                    translateImage,
                    opacity,
                    translateFirstImageOnLoad,
                    (index === FIRST_SLIDE && firstLoad ? styles.firstSlideInitialPosition : undefined),
                ]}
            >
                {item.image}
            </Animated.View>
            <View>
                <Animated.Text
                    style={[
                        styles.title,
                        (index === FIRST_SLIDE ? styles.fontFirstTitle : styles.fontTitle),
                        (index === LAST_SLIDE ? styles.widthLastSlide : undefined),
                        translateTitle,
                        opacity,
                        translateFirstTitleOnLoad,
                        (index === FIRST_SLIDE && firstLoad ? styles.firstSlideInitialPosition : undefined),
                    ]}
                >
                    {item.title}
                </Animated.Text>
                <Animated.Text
                    style={[
                        styles.description,
                        translateDescription,
                        opacity,
                        (index === FIRST_SLIDE && firstLoad ? styles.firstSlideInitialPosition : undefined),
                        (index === LAST_SLIDE ? styles.widthLastSlide : undefined),
                        translateFirstDescriptionOnLoad,
                    ]}
                >
                    {item.description}
                </Animated.Text>
            </View>
        </View>
    );
};

export default React.memo(SlideItem);
