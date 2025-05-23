// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, StyleSheet, View} from 'react-native';

import {CaptionsEnabledContext} from '@calls/context';
import {hasCaptions} from '@calls/utils';
import {Events} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import {useGalleryControls} from '@hooks/gallery';
import SecurityManager from '@managers/security_manager';
import {dismissOverlay, setScreensOrientation} from '@screens/navigation';
import {freezeOtherScreens} from '@utils/gallery';

import Footer from './footer';
import Gallery, {type GalleryRef} from './gallery';
import Header from './header';

import type {GalleryItemType} from '@typings/screens/gallery';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    galleryIdentifier: string;
    hideActions: boolean;
    initialIndex: number;
    items: GalleryItemType[];
}

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const GalleryScreen = ({componentId, galleryIdentifier, hideActions, initialIndex, items}: Props) => {
    const dim = useWindowDimensions();
    const isTablet = useIsTablet();
    const [localIndex, setLocalIndex] = useState(initialIndex);
    const [captionsEnabled, setCaptionsEnabled] = useState<boolean[]>(new Array(items.length).fill(true));
    const [captionsAvailable, setCaptionsAvailable] = useState<boolean[]>([]);
    const {setControlsHidden, headerStyles, footerStyles} = useGalleryControls();
    const dimensions = useMemo(() => ({width: dim.width, height: dim.height}), [dim]);
    const galleryRef = useRef<GalleryRef>(null);

    useEffect(() => {
        const captions = items.reduce((acc, item) => {
            acc.push(hasCaptions(item.postProps));
            return acc;
        }, [] as boolean[]);
        setCaptionsAvailable(captions);
    }, [items]);

    const onCaptionsPressIdx = useCallback((idx: number) => {
        const enabled = [...captionsEnabled];
        enabled[idx] = !enabled[idx];
        setCaptionsEnabled(enabled);
    }, [captionsEnabled, setCaptionsEnabled]);
    const onCaptionsPress = useCallback(() => onCaptionsPressIdx(localIndex), [localIndex, onCaptionsPressIdx]);

    const onClose = useCallback(() => {
        // We keep the un freeze here as we want
        // the screen to be visible when the gallery
        // starts to dismiss as the hanlder for shouldHandleEvent
        // of the lightbox is not called
        freezeOtherScreens(false);
        requestAnimationFrame(() => {
            galleryRef.current?.close();
        });
    }, []);

    const close = useCallback(() => {
        setScreensOrientation(isTablet);
        if (Platform.OS === 'ios' && !isTablet) {
            // We need both the navigation & the module
            RNUtils.lockPortrait();
        }
        freezeOtherScreens(false);
        requestAnimationFrame(async () => {
            dismissOverlay(componentId);
        });
    }, [componentId, isTablet]);

    const onIndexChange = useCallback((index: number) => {
        setLocalIndex(index);
    }, []);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.CLOSE_GALLERY, () => {
            onClose();
        });

        return () => {
            listener.remove();
        };
    }, [onClose]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <CaptionsEnabledContext.Provider value={captionsEnabled}>
            <View
                style={styles.flex}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <Header
                    index={localIndex}
                    onClose={onClose}
                    style={headerStyles}
                    total={items.length}
                />
                <Gallery
                    galleryIdentifier={galleryIdentifier}
                    initialIndex={initialIndex}
                    items={items}
                    onHide={close}
                    onIndexChange={onIndexChange}
                    onShouldHideControls={setControlsHidden}
                    ref={galleryRef}
                    targetDimensions={dimensions}
                />
                <Footer
                    hideActions={hideActions}
                    item={items[localIndex]}
                    style={footerStyles}
                    hasCaptions={captionsAvailable[localIndex]}
                    captionEnabled={captionsEnabled[localIndex]}
                    onCaptionsPress={onCaptionsPress}
                />
            </View>
        </CaptionsEnabledContext.Provider>
    );
};

export default GalleryScreen;
