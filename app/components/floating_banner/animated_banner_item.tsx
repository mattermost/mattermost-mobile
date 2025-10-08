// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Banner from '@components/banner/Banner';
import BannerItem from '@components/banner/banner_item';
import {
    CHANNEL_BANNER_HEIGHT,
    BANNER_SPACING,
} from '@constants/view';
import {useDefaultHeaderHeight} from '@hooks/header';

import type {FloatingBannerConfig} from './types';

type AnimatedBannerItemProps = {
    banner: FloatingBannerConfig;
    index: number;
    isTop: boolean;
    onBannerPress: (banner: FloatingBannerConfig) => void;
    onBannerDismiss: (banner: FloatingBannerConfig) => void;
};

const styles = StyleSheet.create({
    topBannerContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        alignItems: 'center',
    },
    bottomBannerContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        alignItems: 'center',
    },
    relativePosition: {
        position: 'relative',
        top: 0,
    },
});

const AnimatedBannerItem: React.FC<AnimatedBannerItemProps> = ({
    banner,
    index,
    isTop,
    onBannerPress,
    onBannerDismiss,
}) => {
    const {id, dismissible = true, customComponent} = banner;
    const headerHeight = useDefaultHeaderHeight();

    const baseOffset = isTop ? headerHeight + BANNER_SPACING : BANNER_SPACING;
    const stackOffset = baseOffset + (index * (CHANNEL_BANNER_HEIGHT + BANNER_SPACING));

    const handleDismiss = () => onBannerDismiss(banner);

    const animatedPositionStyle = useAnimatedStyle(() => {
        return isTop ? {top: withTiming(stackOffset, {duration: 250})} : {bottom: withTiming(stackOffset, {duration: 250})};
    }, [stackOffset, isTop]);

    return (
        <Animated.View
            key={id}
            style={[
                isTop ? styles.topBannerContainer : styles.bottomBannerContainer,
                animatedPositionStyle,
            ]}
        >
            <Banner
                dismissible={dismissible}
                onDismiss={handleDismiss}
                style={styles.relativePosition}
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
    );
};

export default AnimatedBannerItem;

