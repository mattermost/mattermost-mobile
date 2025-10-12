// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Banner from '@components/banner/Banner';
import BannerItem from '@components/banner/banner_item';
import {
    BANNER_SPACING,
} from '@constants/view';

import type {FloatingBannerConfig} from './types';

type AnimatedBannerItemProps = {
    banner: FloatingBannerConfig;
    index: number;
    onBannerPress: (banner: FloatingBannerConfig) => void;
    onBannerDismiss: (banner: FloatingBannerConfig) => void;
};

const styles = StyleSheet.create({
    bannerContainer: {
        width: '100%',
        alignItems: 'center',
    },
    animatedBannerWrapper: {
        width: '100%',
    },
});

const AnimatedBannerItem: React.FC<AnimatedBannerItemProps> = ({
    banner,
    index,
    onBannerPress,
    onBannerDismiss,
}) => {
    const {dismissible = true, customComponent} = banner;

    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);
    const hasAnimated = useRef(false);

    const handleDismiss = useCallback(() => onBannerDismiss(banner), [banner, onBannerDismiss]);

    useEffect(() => {
        if (hasAnimated.current) {
            return;
        }
        hasAnimated.current = true;
        opacity.value = withTiming(1, {duration: 250});
        translateY.value = withTiming(0, {duration: 250});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- opacity and translateY are sharedValue(s)

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{translateY: translateY.value}],
    }));

    return (
        <View
            style={[
                styles.bannerContainer,
                {marginTop: index > 0 ? BANNER_SPACING : 0},
            ]}
        >
            <Animated.View style={[styles.animatedBannerWrapper, animatedStyle]}>
                <Banner
                    dismissible={dismissible}
                    onDismiss={handleDismiss}
                >
                    {customComponent || (
                        <BannerItem
                            banner={banner}
                            onPress={onBannerPress}
                            onDismiss={onBannerDismiss}
                        />
                    )}
                </Banner>
            </Animated.View>
        </View>
    );
};

export default AnimatedBannerItem;

