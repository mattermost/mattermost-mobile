// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {Platform, Text, View, FlatList, Animated, ListRenderItemInfo, ViewToken} from 'react-native';
import {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {generateId} from '@app/utils/general';
import Background from '@screens/background';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
    const slidesRef = useRef(null);

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    const renderSlide = useCallback(({item: i}: ListRenderItemInfo<any>) => {
        return (
            <SlideItem
                item={i}
                theme={theme}
            />
        );
    }, []);

    const scrollX = useRef(new Animated.Value(0)).current;

    const viewableItemsChanged = useRef(({viewableItems}: any) => {
        setCurrentIndex(viewableItems[0].index);
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
                <FlatList
                    keyExtractor={(item) => item.id}
                    data={slidesData}
                    renderItem={renderSlide}
                    listKey={generateId()}
                    horizontal={true}
                    showsHorizontalScrollIndicator={true}
                    pagingEnabled={true}
                    bounces={false}
                    onScroll={Animated.event([{nativeEvent: {contentOffset: {x: scrollX}}}], {
                        useNativeDriver: false,
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
            />
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    onBoardingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContainer: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
    },
}));

export default Onboarding;
