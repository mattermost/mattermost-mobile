// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, View, type ViewStyle} from 'react-native';

import GlobalClassificationBanner from '@components/global_classification_banner/global_classification_banner';
import {CLASSIFICATION_BANNER_TOTAL_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useClassificationBannerState} from '@hooks/use_classification_banner';

type Props = {
    style?: StyleProp<ViewStyle>;
};

/**
 * Returns the total height of all active global banners.
 * The authenticated layout uses this to inflate safe-area insets so
 * screen content is pushed below the banner area.
 */
export function useGlobalBannerHeight(): number {
    const serverUrl = useServerUrl();
    const {visible} = useClassificationBannerState(serverUrl);

    return visible ? CLASSIFICATION_BANNER_TOTAL_HEIGHT : 0;
}

/**
 * Renders all active global banners stacked vertically.
 */
export default function GlobalBannerOverlay({style}: Props) {
    const serverUrl = useServerUrl();
    const {visible, levelName, color} = useClassificationBannerState(serverUrl);

    if (!visible) {
        return null;
    }

    return (
        <View style={style} pointerEvents='none'>
            <GlobalClassificationBanner
                visible={visible}
                levelName={levelName}
                color={color}
            />
        </View>
    );
}
