// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import React, {useEffect, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaInsetsContext, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchClassificationBanner} from '@actions/remote/classification';
import {CLASSIFICATION_BANNER_TOTAL_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';

import GlobalClassificationBanner from './global_classification_banner';

export const GLOBAL_BANNER_PORTAL_HOST = 'global_banner';

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
});

type Props = {
    visible: boolean;
    levelName: string;
    color: string;
    classificationEnabled: boolean;
    children: React.ReactNode;
}

export default function GlobalClassificationBannerContainer({visible, levelName, color, classificationEnabled, children}: Props) {
    const serverUrl = useServerUrl();
    const realInsets = useSafeAreaInsets();
    const bannerHeight = visible ? CLASSIFICATION_BANNER_TOTAL_HEIGHT : 0;

    const adjustedInsets = useMemo(
        () => ({...realInsets, top: realInsets.top + bannerHeight}),
        [realInsets, bannerHeight],
    );

    // Re-fetch on mount and whenever the feature flag flips, so a runtime toggle
    // (delivered via the config_changed websocket event) refreshes the banner data.
    useEffect(() => {
        fetchClassificationBanner(serverUrl);
    }, [serverUrl, classificationEnabled]);

    return (
        <>
            <SafeAreaInsetsContext.Provider value={adjustedInsets}>
                {children}
            </SafeAreaInsetsContext.Provider>
            {visible && (
                <Portal hostName={GLOBAL_BANNER_PORTAL_HOST}>
                    <View
                        style={[styles.wrapper, {top: realInsets.top}]}
                        pointerEvents='none'
                    >
                        <GlobalClassificationBanner
                            visible={visible}
                            levelName={levelName}
                            color={color}
                        />
                    </View>
                </Portal>
            )}
        </>
    );
}
