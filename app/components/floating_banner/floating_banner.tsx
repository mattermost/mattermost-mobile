// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';

import BannerSection from './banner_section';

import type {FloatingBannerConfig} from './types';

type FloatingBannerProps = {
    banners: FloatingBannerConfig[];
    onDismiss: (id: string) => void;
};

const FloatingBanner: React.FC<FloatingBannerProps> = ({banners, onDismiss}) => {
    if (!banners || !banners.length) {
        return null;
    }

    const onBannerPress = useCallback((banner: FloatingBannerConfig) => {
        if (banner.onPress) {
            banner.onPress();
        }
    }, []);

    const onBannerDismiss = useCallback((banner: FloatingBannerConfig) => {
        onDismiss(banner.id);
        if (banner.onDismiss) {
            banner.onDismiss();
        }
    }, [onDismiss]);

    const topBanners = useMemo(
        () => banners.filter((banner) => (banner.position || 'top') === 'top'),
        [banners],
    );

    const bottomBanners = useMemo(
        () => banners.filter((banner) => banner.position === 'bottom'),
        [banners],
    );

    return (
        <>
            <BannerSection
                sectionBanners={topBanners}
                position='top'
                onBannerPress={onBannerPress}
                onBannerDismiss={onBannerDismiss}
            />
            <BannerSection
                sectionBanners={bottomBanners}
                position='bottom'
                onBannerPress={onBannerPress}
                onBannerDismiss={onBannerDismiss}
            />
        </>
    );
};

export default FloatingBanner;
