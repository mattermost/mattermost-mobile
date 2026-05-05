// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import GlobalClassificationBanner from '@components/global_classification_banner/global_classification_banner';
import {CLASSIFICATION_BANNER_TOTAL_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useClassificationBannerState} from '@hooks/use_classification_banner';

type GlobalClassificationBannerResult = {
    bannerHeight: number;
    BannerComponent: React.ReactNode;
};

export function useGlobalClassificationBanner(): GlobalClassificationBannerResult {
    const serverUrl = useServerUrl();
    const {visible, levelName, color} = useClassificationBannerState(serverUrl);

    const bannerHeight = visible ? CLASSIFICATION_BANNER_TOTAL_HEIGHT : 0;

    const BannerComponent = useMemo(() => {
        if (!visible) {
            return null;
        }

        return (
            <GlobalClassificationBanner
                visible={visible}
                levelName={levelName}
                color={color}
            />
        );
    }, [visible, levelName, color]);

    return {bannerHeight, BannerComponent};
}
