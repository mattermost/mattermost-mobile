// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Banner from '@components/banner';
import BannerItem from '@components/banner/banner_item';
import {useIsTablet} from '@hooks/device';

const BOTTOM_OFFSET_PHONE = 120;
const TABLET_EXTRA_BOTTOM_OFFSET = 60;
const BANNER_STACK_SPACING = 60;
const BOTTOM_BANNER_EXTRA_OFFSET = 8;

import type {BannerConfig} from './types';

type FloatingBannerProps = {
    banners: BannerConfig[];
    onDismiss: (id: string) => void;
};

const FloatingBanner: React.FC<FloatingBannerProps> = ({banners, onDismiss}) => {
    const isTablet = useIsTablet();
    const executeBannerAction = (banner: BannerConfig) => {
        if (banner.onPress) {
            banner.onPress();
        }
    };

    const dismissBanner = (banner: BannerConfig) => {
        onDismiss(banner.id);
        if (banner.onDismiss) {
            banner.onDismiss();
        }
    };

    if (!banners.length) {
        return null;
    }

    // Separate banners by position to handle safe area correctly
    const topBanners = banners.filter((banner) => (banner.position || 'top') === 'top');
    const bottomBanners = banners.filter((banner) => banner.position === 'bottom');

    const renderSection = (
        sectionBanners: BannerConfig[],
        position: 'top' | 'bottom',
    ) => {
        if (!sectionBanners.length) {
            return null;
        }

        const isTop = position === 'top';
        const testID = isTop ? 'floating-banner-top-container' : 'floating-banner-bottom-container';
        const edges = isTop ? ['top'] as const : ['bottom'] as const;
        const containerStyle = isTop ? [styles.containerBase, styles.topContainer] : [
            styles.containerBase,
            styles.bottomContainer,
            {bottom: isTablet ? (BOTTOM_OFFSET_PHONE + TABLET_EXTRA_BOTTOM_OFFSET) : BOTTOM_OFFSET_PHONE},
        ];

        return (
            <SafeAreaView
                testID={testID}
                style={containerStyle}
                edges={edges}
            >
                {sectionBanners.map((banner, index) => (
                    <Banner
                        key={banner.id}
                        position={position}
                        visible={true}
                        {...(isTop ? {customTopOffset: index * BANNER_STACK_SPACING} : {customBottomOffset: (index * BANNER_STACK_SPACING) + BOTTOM_BANNER_EXTRA_OFFSET})}
                        dismissible={banner.dismissible !== false}
                        onDismiss={() => dismissBanner(banner)}
                    >
                        {banner.customContent ? (
                            banner.customContent
                        ) : (
                            <BannerItem
                                banner={banner}
                                onPress={executeBannerAction}
                                onDismiss={dismissBanner}
                            />
                        )}
                    </Banner>
                ))}
            </SafeAreaView>
        );
    };

    return (
        <>
            {renderSection(topBanners, 'top')}
            {renderSection(bottomBanners, 'bottom')}
        </>
    );
};

const styles = StyleSheet.create({
    containerBase: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 16,
        pointerEvents: 'box-none',
        alignItems: 'center',
    },
    topContainer: {
        top: 0,
        paddingTop: 8,
    },
    bottomContainer: {
        bottom: BOTTOM_OFFSET_PHONE,
        paddingBottom: 8,
    },
});

export default FloatingBanner;

export const testExports = {
    BOTTOM_OFFSET_PHONE,
    TABLET_EXTRA_BOTTOM_OFFSET,
};
