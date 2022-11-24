// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {View, ListRenderItemInfo, useWindowDimensions, SafeAreaView, ScrollView, StyleSheet, Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';

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

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const Onboarding = ({
    theme,
}: OnboardingProps) => {
    const {width} = useWindowDimensions();
    const {slidesData} = useSlidesData();
    const LAST_SLIDE_INDEX = slidesData.length - 1;
    const dimensions = useWindowDimensions();
    const slidesRef = useAnimatedRef<ScrollView>();

    const scrollX = useSharedValue(0);

    // used to smothly animate the whole onboarding screen during the appear event scenario (from server screen back to onboarding screen)
    const translateX = useSharedValue(dimensions.width);

    const currentIndex = useDerivedValue(() => Math.round(scrollX.value / width));

    const moveToSlide = useCallback((slideIndexToMove: number) => {
        slidesRef.current?.scrollTo({
            x: (slideIndexToMove * width),
            animated: true,
        });
    }, [currentIndex.value]);

    const nextSlide = useCallback(() => {
        const nextSlideIndex = currentIndex.value + 1;
        if (slidesRef.current && currentIndex.value < LAST_SLIDE_INDEX) {
            moveToSlide(nextSlideIndex);
        } else if (slidesRef.current && currentIndex.value === LAST_SLIDE_INDEX) {
            signInHandler();
        }
    }, [currentIndex.value, slidesRef.current, moveToSlide]);

    const signInHandler = useCallback(() => {
        // mark the onboarding as already viewed
        storeOnboardingViewedValue();

        goToScreen(Screens.SERVER, '', {animated: true, theme}, loginAnimationOptions());
    }, []);

    const renderSlide = useCallback(({item, index}: ListRenderItemInfo<OnboardingItem>) => {
        return (
            <SlideItem
                item={item}
                theme={theme}
                scrollX={scrollX}
                index={index}
                key={`key-${index.toString()}`}
                lastSlideIndex={LAST_SLIDE_INDEX}
            />
        );
    }, [theme]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
            },
            componentDidDisappear: () => {
                translateX.value = -dimensions.width;
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(listener, Screens.ONBOARDING);

        return () => unsubscribe.remove();
    }, [dimensions]);

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    return (
        <View
            style={styles.onBoardingContainer}
            testID='onboarding.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                style={[styles.scrollContainer, transform]}
                key={'onboarding_content'}
            >
                <Animated.ScrollView
                    scrollEventThrottle={16}
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
                    lastSlideIndex={LAST_SLIDE_INDEX}
                />
            </AnimatedSafeArea>
        </View>
    );
};

export default Onboarding;
