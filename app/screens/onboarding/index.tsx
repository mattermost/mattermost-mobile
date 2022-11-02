// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {View, ListRenderItemInfo, useWindowDimensions, Platform, SafeAreaView} from 'react-native';
import Animated, {runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Background from '@screens/background';
import {makeStyleSheetFromTheme} from '@utils/theme';

import FooterButtons from './footer_buttons';
import Paginator from './paginator';
import SlideItem from './slide';
import slidesData from './slides_data';

import type {LaunchProps} from '@typings/launch';

interface OnboardingProps extends LaunchProps {
    theme: Theme;
}

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const Onboarding = ({
    theme,
}: OnboardingProps) => {
    const {width} = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const [isLastSlide, setIsLastSlide] = useState(false);
    const lastSlideIndex = slidesData.length - 1;
    const slidesRef = useAnimatedRef<Animated.ScrollView>();
    const currentIndex = useSharedValue(0);
    const scrollX = useSharedValue(0);

    const nextSlide = () => {
        const nextSlideIndex = currentIndex.value + 1;
        if (slidesRef.current && currentIndex.value < lastSlideIndex) {
            moveToSlide(nextSlideIndex);
        }
    };

    const moveToSlide = (slideIndexToMove: number) => {
        currentIndex.value = slideIndexToMove;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        slidesRef?.current?.scrollTo({x: (slideIndexToMove * width), animated: true});
    };

    const signInHandler = () => {
        // temporal validation
        setIsLastSlide(!isLastSlide);
    };

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(scrollX.value, {duration})}],
        };
    }, []);

    const renderSlide = useCallback(({item, index}: ListRenderItemInfo<any>) => {
        return (
            <SlideItem
                item={item}
                theme={theme}
                scrollX={scrollX}
                index={index}
                key={item.id}
            />
        );
    }, []);

    const toogleIsLastSlideValue = (isLast: boolean) => {
        setIsLastSlide(isLast);
    };

    const handleScroll = useAnimatedScrollHandler(({contentOffset: {x}}) => {
        const calculatedIndex = Math.round(x / width);

        if (calculatedIndex !== currentIndex.value) {
            currentIndex.value = calculatedIndex;
            runOnJS(toogleIsLastSlideValue)(calculatedIndex === lastSlideIndex);
        }
    });

    return (
        <View
            style={styles.onBoardingContainer}
            testID='onboarding.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                key={'onboarding_content'}
                style={[styles.scrollContainer, transform]}
            >
                <Animated.ScrollView
                    scrollEventThrottle={16}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={true}
                    bounces={false}
                    onMomentumScrollEnd={handleScroll}
                    ref={slidesRef}
                >
                    {slidesData.map((item, index) => {
                        return renderSlide({item, index} as ListRenderItemInfo<any>);
                    })}
                </Animated.ScrollView>
                <Paginator
                    data={slidesData}
                    theme={theme}
                    scrollX={scrollX}
                    moveToSlide={moveToSlide}
                />
                <FooterButtons
                    theme={theme}
                    isLastSlide={isLastSlide}
                    nextSlideHandler={nextSlide}
                    signInHandler={signInHandler}
                />
            </AnimatedSafeArea>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    onBoardingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'top',
    },
    scrollContainer: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
    },
}));

export default Onboarding;
