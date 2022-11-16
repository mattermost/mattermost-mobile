// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {View, ListRenderItemInfo, useWindowDimensions, SafeAreaView, ScrollView, Animated as AnimatedRN, StyleSheet} from 'react-native';
import Animated, {Easing, useAnimatedRef, useAnimatedScrollHandler, useDerivedValue, useSharedValue} from 'react-native-reanimated';

import {storeOnboardingViewedValue} from '@actions/app/global';
import {Screens} from '@app/constants';
import Background from '@screens/background';
import {goToScreen, loginAnimationOptions} from '@screens/navigation';
import {OnboardingItem} from '@typings/screens/onboarding';

import FooterButtons from './footer_buttons';
import Paginator from './paginator';
import SlideItem from './slide';
import useSlidesData from './slides_data';

import type {LaunchProps} from '@typings/launch';

interface OnboardingProps extends LaunchProps {
    theme: Theme;
}

const styles = StyleSheet.create({
    onBoardingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'top',
    },
    scrollContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const Onboarding = ({
    theme,
}: OnboardingProps) => {
    const {width} = useWindowDimensions();
    const {slidesData} = useSlidesData();
    const lastSlideIndex = slidesData.length - 1;
    const slidesRef = useAnimatedRef<ScrollView>();

    const scrollX = useSharedValue(0);
    const scrollAnimation = useRef(new AnimatedRN.Value(0));

    const currentIndex = useDerivedValue(() => Math.round(scrollX.value / width));

    useEffect(() => {
        scrollAnimation.current?.addListener((animation) => {
            slidesRef.current?.scrollTo({
                x: animation.value,
                animated: false,
            });
        });
        return () => scrollAnimation.current.removeAllListeners();
    }, []);

    const moveToSlide = useCallback((slideIndexToMove: number) => {
        AnimatedRN.timing(scrollAnimation.current, {
            toValue: (slideIndexToMove * width),
            duration: Math.abs(currentIndex.value - slideIndexToMove) * 200,
            useNativeDriver: true,
            easing: Easing.linear,
        }).start();
    }, [currentIndex.value]);

    const nextSlide = useCallback(() => {
        const nextSlideIndex = currentIndex.value + 1;
        if (slidesRef.current && currentIndex.value < lastSlideIndex) {
            moveToSlide(nextSlideIndex);
        } else if (slidesRef.current && currentIndex.value === lastSlideIndex) {
            signInHandler();
        }
    }, [currentIndex.value, slidesRef.current, moveToSlide]);

    const signInHandler = useCallback(() => {
        // mark the onboarding as already viewed
        storeOnboardingViewedValue();

        goToScreen(Screens.SERVER, '', {theme}, loginAnimationOptions());
    }, []);

    const renderSlide = useCallback(({item, index}: ListRenderItemInfo<OnboardingItem>) => {
        return (
            <SlideItem
                item={item}
                theme={theme}
                scrollX={scrollX}
                index={index}
                key={`key-${index.toString()}`}
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
            <SafeAreaView
                key={'onboarding_content'}
                style={styles.scrollContainer}
            >
                <Animated.ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={true}
                    bounces={false}
                    onScroll={scrollHandler}
                    ref={slidesRef as any}
                >
                    {slidesData.map((item, index) => {
                        return renderSlide({item, index} as ListRenderItemInfo<OnboardingItem>);
                    })}
                </Animated.ScrollView>
                <Paginator
                    dataLength={slidesData.length}
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
            </SafeAreaView>
        </View>
    );
};

export default Onboarding;
