// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {Platform, Text, View, FlatList, ScrollView, ListRenderItemInfo} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {generateId} from '@app/utils/general';
import Background from '@screens/background';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    const renderSlide = useCallback(({item: t}: ListRenderItemInfo<any>) => {
        return (
            <SlideItem
                item={t}
                theme={theme}
            />
        );
    }, []);

    return (
        <View
            style={styles.flex}
            testID='onboarding.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                key={'onboarding_content'}
                style={[styles.flex, transform]}
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
                />
            </AnimatedSafeArea>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
    },
}));

export default Onboarding;
