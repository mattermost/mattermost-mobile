// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, View} from 'react-native';

import {Events, Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useWindowDimensions} from '@hooks/device';
import {useGalleryControls} from '@hooks/gallery';
import {navigateBack} from '@utils/navigation/adapter';

import Footer from './footer';
import Gallery, {type GalleryRef} from './gallery';
import Header from './header';

import type {GalleryItemType} from '@typings/screens/gallery';

export type GalleryProps = {
    galleryIdentifier: string;
    hideActions: boolean;
    initialIndex: number;
    items: GalleryItemType[];
}

const GalleryScreen = ({galleryIdentifier, hideActions, initialIndex, items}: GalleryProps) => {
    const dim = useWindowDimensions();
    const [localIndex, setLocalIndex] = useState(initialIndex);
    const {headerAndFooterHidden, hideHeaderAndFooter, headerStyles, footerStyles} = useGalleryControls();
    const galleryRef = useRef<GalleryRef>(null);

    const containerStyle = dim;

    const onClose = useCallback(() => {
        requestAnimationFrame(() => {
            hideHeaderAndFooter();
            galleryRef.current?.close();
        });
    }, [hideHeaderAndFooter]);

    const close = useCallback(() => {
        // setScreensOrientation(isTablet);
        // if (Platform.OS === 'ios' && !isTablet) {
        //     // We need both the navigation & the module
        //     RNUtils.lockPortrait();
        // }
        requestAnimationFrame(async () => {
            navigateBack();
        });
    }, []);

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

    useAndroidHardwareBackHandler(Screens.GALLERY, close);

    return (
        <View style={containerStyle}>
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
