// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, StyleSheet, View} from 'react-native';

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
    container: {
        flex: 1,
    },
});

const GalleryScreen = ({componentId, galleryIdentifier, hideActions, initialIndex, items}: Props) => {
    const dim = useWindowDimensions();
    const isTablet = useIsTablet();
    const [localIndex, setLocalIndex] = useState(initialIndex);
    const {headerAndFooterHidden, hideHeaderAndFooter, headerStyles, footerStyles} = useGalleryControls();
    const galleryRef = useRef<GalleryRef>(null);

    const containerStyle = useMemo(() => {
        if (Platform.OS === 'ios') {
            return dim;
        }

        return styles.container;
    }, [dim]);

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
        <View
            style={containerStyle}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <Header
                index={localIndex}
                onClose={onClose}
                style={headerStyles}
                total={items.length}
            />
            <Gallery
                headerAndFooterHidden={headerAndFooterHidden}
                galleryIdentifier={galleryIdentifier}
                initialIndex={initialIndex}
                items={items}
                onHide={close}
                onIndexChange={onIndexChange}
                hideHeaderAndFooter={hideHeaderAndFooter}
                ref={galleryRef}
                targetDimensions={dim}
            />
            <Footer
                hideActions={hideActions}
                item={items[localIndex]}
                style={footerStyles}
            />
        </View>
    );
};

export default GalleryScreen;
