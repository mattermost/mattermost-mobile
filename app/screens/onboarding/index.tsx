// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {
    View,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
    BackHandler,
} from 'react-native';
import Animated, {useDerivedValue, useSharedValue} from 'react-native-reanimated';

import {storeOnboardingViewedValue} from '@actions/app/global';
import {Screens} from '@constants';
import {useWindowDimensions} from '@hooks/device';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import Background from '@screens/background';
import {navigateToScreen} from '@utils/navigation/adapter';

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
    ...props
}: OnboardingProps) => {
    const {width} = useWindowDimensions();
    const {slidesData} = useSlidesData();
    const LAST_SLIDE_INDEX = slidesData.length - 1;
    const slidesRef = useRef<ScrollView>(null);

    const scrollX = useSharedValue(0);

    const currentIndex = useDerivedValue(() => Math.round(scrollX.value / width));

    const moveToSlide = useCallback((slideIndexToMove: number) => {
        slidesRef.current?.scrollTo({
            x: (slideIndexToMove * width),
            animated: true,
        });
    }, [width]);

    const signInHandler = useCallback(() => {
        // mark the onboarding as already viewed
        storeOnboardingViewedValue();

        navigateToScreen(Screens.SERVER, {theme, ...props});
    }, []);

    const nextSlide = useCallback(() => {
        const nextSlideIndex = currentIndex.value + 1;
        if (slidesRef.current && currentIndex.value < LAST_SLIDE_INDEX) {
            moveToSlide(nextSlideIndex);
        } else if (slidesRef.current && currentIndex.value === LAST_SLIDE_INDEX) {
            signInHandler();
        }
    }, [LAST_SLIDE_INDEX, currentIndex.value, moveToSlide, signInHandler]);

    const scrollHandler = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollX.value = event.nativeEvent.contentOffset.x;
    }, []);

    const animatedStyles = useScreenTransitionAnimation();

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!currentIndex.value) {
                return false;
            }

            moveToSlide(currentIndex.value - 1);
            return true;
        });

        return () => listener.remove();
    }, []);

    return (
        <View
            style={styles.onBoardingContainer}
            testID='onboarding.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                style={[styles.scrollContainer, animatedStyles]}
                key={'onboarding_content'}
            >
                <ScrollView
                    scrollEventThrottle={16}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={true}
                    bounces={false}
                    onScroll={scrollHandler}
                    ref={slidesRef}
                >
                    {slidesData.map((item, index) => {
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
                    })}
                </ScrollView>
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
