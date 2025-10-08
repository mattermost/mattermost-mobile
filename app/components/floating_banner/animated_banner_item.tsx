// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

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
    relativePosition: {
        position: 'relative',
        top: 0,
    },
});

const AnimatedBannerItem: React.FC<AnimatedBannerItemProps> = ({
    banner,
    index,
    onBannerPress,
    onBannerDismiss,
}) => {
    const {id, dismissible = true, customComponent} = banner;

    const handleDismiss = () => onBannerDismiss(banner);

    const animatedPositionStyle = useAnimatedStyle(() => {
        const spacing = index > 0 ? BANNER_SPACING : 0;
        return {marginTop: withTiming(spacing, {duration: 250})};
    }, [index]);

    return (
        <Animated.View
            key={id}
            style={[
                styles.bannerContainer,
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

