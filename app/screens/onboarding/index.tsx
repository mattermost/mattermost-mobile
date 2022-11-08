// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, ListRenderItemInfo, useWindowDimensions, SafeAreaView} from 'react-native';
import Animated, {useAnimatedRef, useAnimatedScrollHandler, useDerivedValue, useSharedValue} from 'react-native-reanimated';

import {Screens} from '@app/constants';
import Background from '@screens/background';
import {goToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import FooterButtons from './footer_buttons';
import Paginator from './paginator';
import SlideItem from './slide';
import useSlidesData, {OnboardingItem} from './slides_data';

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
    const slidesData = useSlidesData().slidesData;
    const lastSlideIndex = slidesData.length - 1;
    const slidesRef = useAnimatedRef<Animated.ScrollView>();

    // const currentIndex = useSharedValue(0);
    const scrollX = useSharedValue(0);
    const currentIndex = useDerivedValue(() => Math.round(scrollX.value / width));

    const moveToSlide = useCallback((slideIndexToMove: number) => {
        slidesRef.current?.scrollTo({x: (slideIndexToMove * width), animated: true});
    }, [slidesRef.current]);

    const nextSlide = useCallback(() => {
        const nextSlideIndex = currentIndex.value + 1;
        if (slidesRef.current && currentIndex.value < lastSlideIndex) {
            moveToSlide(nextSlideIndex);
        } else if (slidesRef.current && currentIndex.value === lastSlideIndex) {
            signInHandler();
        }
    }, [currentIndex.value, slidesRef.current, moveToSlide]);

    const signInHandler = useCallback(() => {
        goToScreen(Screens.SERVER, '', {theme});
    }, []);

    const renderSlide = useCallback(({item, index}: ListRenderItemInfo<OnboardingItem>) => {
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

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    return (
        <View
            style={styles.onBoardingContainer}
            testID='onboarding.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                key={'onboarding_content'}
                style={[styles.scrollContainer]}
            >
                <Animated.ScrollView
                    scrollEventThrottle={16}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={true}
                    bounces={false}
                    onScroll={scrollHandler}
                    ref={slidesRef}
                >
                    {slidesData.map((item, index) => {
                        return renderSlide({item, index} as ListRenderItemInfo<OnboardingItem>);
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
                    nextSlideHandler={nextSlide}
                    signInHandler={signInHandler}
                    scrollX={scrollX}
                    lastSlideIndex={lastSlideIndex}
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
