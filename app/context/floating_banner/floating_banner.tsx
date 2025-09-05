// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Banner from '@components/banner';
import BannerItem from '@components/banner/banner_item';

import {useBanner, type BannerConfig} from './';

const FloatingBanner: React.FC = () => {
    const {banners, hideBanner} = useBanner();

    const executeBannerAction = (banner: BannerConfig) => {
        if (banner.onPress) {
            banner.onPress();
        }
    };

    const dismissBanner = (banner: BannerConfig) => {
        hideBanner(banner.id);
        if (banner.onDismiss) {
            banner.onDismiss();
        }
    };

    if (banners.length === 0) {
        return null;
    }

    return (
        <>
            {banners.map((banner, index) => (
                <Banner
                    key={banner.id}
                    position={banner.position || 'top'}
                    visible={true}
                    customTopOffset={index * 60}
                    customBottomOffset={120}
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
        </>
    );
};

export default FloatingBanner;
