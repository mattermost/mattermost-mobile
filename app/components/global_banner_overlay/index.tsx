// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import GlobalClassificationBanner from '@components/global_classification_banner/global_classification_banner';
import {CLASSIFICATION_BANNER_TOTAL_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useClassificationBannerState} from '@hooks/use_classification_banner';

export const GLOBAL_BANNER_PORTAL_HOST = 'global_banner';

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
});

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
 * Teleports the active global banners to the `global_banner` PortalHost.
 * Render this once alongside the PortalHost in the authenticated layout;
 * no per-screen wiring is required.
 */
export default function GlobalBannerContainer() {
    const serverUrl = useServerUrl();
    const {visible, levelName, color} = useClassificationBannerState(serverUrl);
    const insets = useSafeAreaInsets();

    if (!visible) {
        return null;
    }

    return (
        <Portal hostName={GLOBAL_BANNER_PORTAL_HOST}>
            <View
                style={[styles.wrapper, {top: insets.top}]}
                pointerEvents='none'
            >
                <GlobalClassificationBanner
                    visible={visible}
                    levelName={levelName}
                    color={color}
                />
            </View>
        </Portal>
    );
}
