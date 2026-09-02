// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Portal} from '@gorhom/portal';
import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaInsetsContext, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchAccessControlAttributeFields} from '@actions/remote/classification';
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
    channelAttributesEnabled: boolean;
    hostName: string;
    children: React.ReactNode;
}

export default function GlobalClassificationBannerContainer({visible, levelName, color, classificationEnabled, channelAttributesEnabled, hostName, children}: Props) {
    const serverUrl = useServerUrl();
    const realInsets = useSafeAreaInsets();

    // The banner state is derived from stored property rows, and those rows are now
    // fetched whenever *either* the classification or the channel attributes flag
    // is on. So visibility has to re-check the classification flag here: without
    // it, enabling channel attributes would surface the global classification
    // banner on a server where classification markings are switched off.
    const showBanner = visible && classificationEnabled;
    const bannerHeight = showBanner ? CLASSIFICATION_BANNER_TOTAL_HEIGHT : 0;

    const adjustedInsets = useMemo(
        () => ({...realInsets, top: realInsets.top + bannerHeight}),
        [realInsets, bannerHeight],
    );

    // Respect the cache on mount/server switch, but force a refresh when either
    // feature flag actually flips for the same server (runtime toggle via
    // config_changed websocket). A server switch is a cache-respecting mount, not
    // a flag flip, so the previous values are scoped per server.
    //
    // Both flags matter: the fetch is what publishes the property group id, and
    // without forcing it, turning channel attributes on mid-session left the chips
    // and Channel Info rows empty until the one-hour cache expired.
    const prev = useRef({serverUrl, classification: classificationEnabled, attributes: channelAttributesEnabled});
    useEffect(() => {
        const sameServer = prev.current.serverUrl === serverUrl;
        const flagChanged = sameServer && (
            prev.current.classification !== classificationEnabled ||
            prev.current.attributes !== channelAttributesEnabled
        );
        prev.current = {serverUrl, classification: classificationEnabled, attributes: channelAttributesEnabled};
        fetchAccessControlAttributeFields(serverUrl, flagChanged);
    }, [serverUrl, classificationEnabled, channelAttributesEnabled]);

    return (
        <>
            <SafeAreaInsetsContext.Provider value={adjustedInsets}>
                {children}
            </SafeAreaInsetsContext.Provider>
            {showBanner && (
                <Portal hostName={hostName}>
                    <View
                        style={[styles.wrapper, {top: realInsets.top}]}
                        pointerEvents='none'
                    >
                        <GlobalClassificationBanner
                            visible={showBanner}
                            levelName={levelName}
                            color={color}
                        />
                    </View>
                </Portal>
            )}
        </>
    );
}
