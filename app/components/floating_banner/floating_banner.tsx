// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Banner from '@components/banner';
import BannerItem from '@components/banner/banner_item';

import type {BannerConfig} from './types';

type FloatingBannerProps = {
    banners: BannerConfig[];
    onDismiss: (id: string) => void;
};

const FloatingBanner: React.FC<FloatingBannerProps> = ({banners, onDismiss}) => {
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

    if (banners.length === 0) {
        return null;
    }

    // Separate banners by position to handle safe area correctly
    const topBanners = banners.filter((banner) => (banner.position || 'top') === 'top');
    const bottomBanners = banners.filter((banner) => banner.position === 'bottom');

    return (
        <>
            {/* Top banners with top safe area */}
            {topBanners.length > 0 && (
                <SafeAreaView
                    style={styles.topContainer}
                    edges={['top']}
                >
                    {topBanners.map((banner, index) => (
                        <Banner
                            key={banner.id}
                            position='top'
                            visible={true}
                            customTopOffset={index * 60}
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
            )}

            {/* Bottom banners with bottom safe area */}
            {bottomBanners.length > 0 && (
                <SafeAreaView
                    style={styles.bottomContainer}
                    edges={['bottom']}
                >
                    {bottomBanners.map((banner, index) => (
                        <Banner
                            key={banner.id}
                            position='bottom'
                            visible={true}
                            customBottomOffset={(index * 60) + 8}
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
            )}
        </>
    );
};

const styles = StyleSheet.create({
    topContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 16,
        paddingTop: 8,
        pointerEvents: 'box-none',
        alignItems: 'center',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 16,
        paddingBottom: 8,
        pointerEvents: 'box-none',
        alignItems: 'center',
    },
});

export default FloatingBanner;
