// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';

import GlobalClassificationBanner from '@components/global_classification_banner/global_classification_banner';
import {CLASSIFICATION_BANNER_TOTAL_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {useClassificationBanner} from '@hooks/use_classification_banner';
import {getConfigValue} from '@queries/servers/system';
import {logWarning} from '@utils/log';

type GlobalClassificationBannerResult = {
    bannerHeight: number;
    BannerComponent: React.ReactNode;
};

export function useGlobalClassificationBanner(): GlobalClassificationBannerResult {
    const serverUrl = useServerUrl();
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const {visible, levelName, color} = useClassificationBanner(featureEnabled);

    useEffect(() => {
        const checkFeatureFlag = async () => {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const value = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
                setFeatureEnabled(value === 'true');
            } catch (e) {
                logWarning('Failed to check ClassificationMarkings feature flag', e);
            }
        };

        checkFeatureFlag();
    }, [serverUrl]);

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
