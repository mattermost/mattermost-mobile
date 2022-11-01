// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {Platform, View, Animated, ListRenderItemInfo} from 'react-native';
import {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {generateId} from '@app/utils/general';
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
    const translateX = useSharedValue(0);
    const styles = getStyleSheet(theme);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLastSlide, setIsLastSlide] = useState(false);
    const lastSlideIndex = slidesData.length - 1;
    const slidesRef = useRef(null);

    const nextSlide = () => {
        const nextSlideIndex = currentIndex + 1;
        if (slidesRef.current && currentIndex < lastSlideIndex) {
            moveToSlide(nextSlideIndex);
        }
    };

    const moveToSlide = (slideIndexToMove: number) => {
        setIsLastSlide(slideIndexToMove === lastSlideIndex);
        setCurrentIndex(slideIndexToMove);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        slidesRef?.current?.scrollToIndex({index: slideIndexToMove});
    };

    const signInHandler = () => {
        console.log('sign in handler');
    };

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    const renderSlide = useCallback(({item, index}: ListRenderItemInfo<any>) => {
        return (
            <SlideItem
                item={item}
                theme={theme}
                scrollX={scrollX}
                index={index}
            />
        );
    }, []);

    const scrollX = useRef(new Animated.Value(0)).current;

    const viewableItemsChanged = useRef(({viewableItems}: any) => {
        setCurrentIndex(viewableItems[0].index);
        setIsLastSlide(viewableItems[0].index === lastSlideIndex);
    }).current;

    const viewConfig = useRef({viewAreaCoveragePercentThreshold: 50}).current;

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
                <Animated.FlatList
                    keyExtractor={(item) => item.id}
                    data={slidesData}
                    renderItem={renderSlide}
                    listKey={generateId()}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={true}
                    bounces={false}
                    onScroll={Animated.event([{nativeEvent: {contentOffset: {x: scrollX}}}], {
                        useNativeDriver: true,
                    })}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    scrollEventThrottle={32}
                    ref={slidesRef}
                />
            </AnimatedSafeArea>
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
                scrollX={scrollX}
            />
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
