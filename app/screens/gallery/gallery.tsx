// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {BackHandler} from 'react-native';
import Animated, {runOnJS, runOnUI, useAnimatedReaction, type SharedValue} from 'react-native-reanimated';

import {buildFilePreviewUrl} from '@actions/remote/file';
import {useGallery} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {isGif} from '@utils/file';
import {freezeOtherScreens, galleryItemToFileInfo, measureItem} from '@utils/gallery';

import LightboxSwipeout, {type LightboxSwipeoutRef, type RenderItemInfo} from './lightbox_swipeout';
import Backdrop, {type BackdropProps} from './lightbox_swipeout/backdrop';
import DocumentRenderer from './renderers/document';
import VideoRenderer from './renderers/video';
import GalleryViewer from './viewer';

import type {GalleryItemType, GalleryPagerItem} from '@typings/screens/gallery';

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface GalleryProps {
    headerAndFooterHidden: SharedValue<boolean>;
    galleryIdentifier: string;
    initialIndex: number;
    items: GalleryItemType[];
    onIndexChange?: (index: number) => void;
    onHide: () => void;
    targetDimensions: { width: number; height: number };
    hideHeaderAndFooter: (hide: boolean) => void;
}

export interface GalleryRef {
    close: () => void;
}

const Gallery = forwardRef<GalleryRef, GalleryProps>(({
    headerAndFooterHidden,
    galleryIdentifier,
    initialIndex,
    items,
    onHide,
    targetDimensions,
    hideHeaderAndFooter,
    onIndexChange,
}: GalleryProps, ref) => {
    const {refsByIndexSV, sharedValues} = useGallery(galleryIdentifier);
    const [localIndex, setLocalIndex] = useState(initialIndex);
    const lightboxRef = useRef<LightboxSwipeoutRef>(null);
    const item = items[localIndex];
    const fileInfo = useMemo(() => galleryItemToFileInfo(item), [item]);
    const serverUrl = useServerUrl();

    const close = () => {
        lightboxRef.current?.closeLightbox();
    };

    const onLocalIndex = (index: number) => {
        setLocalIndex(index);
        onIndexChange?.(index);
    };

    useEffect(() => {
        runOnUI(() => {
            'worklet';

            const tw = targetDimensions.width;
            sharedValues.targetWidth.value = tw;
            const scaleFactor = item.width / targetDimensions.width;
            const th = item.height / scaleFactor;
            sharedValues.targetHeight.value = th;
        })();
    }, [item, targetDimensions.width]);

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            lightboxRef.current?.closeLightbox();
            return true;
        });

        return () => listener.remove();
    }, []);

    useImperativeHandle(ref, () => ({
        close,
    }));

    useAnimatedReaction(
        () => {
            return sharedValues.activeIndex.value;
        },
        (index) => {
            const galleryItems = refsByIndexSV.value;

            if (index > -1 && galleryItems[index] && items[index].type !== 'file') {
                measureItem(galleryItems[index].ref, sharedValues);
            }
        },
    );

    const onIndexChangeWorklet = useCallback((nextIndex: number) => {
        'worklet';

        runOnJS(onLocalIndex)(nextIndex);
        sharedValues.activeIndex.value = nextIndex;
    }, []);

    const renderBackdropComponent = useCallback(
        ({animatedStyles, translateY}: BackdropProps) => {
            return (
                <Backdrop
                    animatedStyles={animatedStyles}
                    translateY={translateY}
                />
            );
        },
        [],
    );

    function onSwipeActive(translateY: number) {
        'worklet';

        if (Math.abs(translateY) > 8) {
            hideHeaderAndFooter(true);
        }
    }

    function onSwipeFailure() {
        'worklet';

        runOnJS(freezeOtherScreens)(true);
        hideHeaderAndFooter(false);
    }

    const hideLightboxItem = useCallback(() => {
        'worklet';

        sharedValues.width.value = 0;
        sharedValues.height.value = 0;
        sharedValues.opacity.value = 1;
        sharedValues.activeIndex.value = -1;
        sharedValues.x.value = 0;
        sharedValues.y.value = 0;

        runOnJS(onHide)();
    }, []);

    const onRenderItem = useCallback((info: RenderItemInfo) => {
        if (item.type === 'video' && item.posterUri) {
            return (
                <AnimatedImage
                    placeholder={{uri: item.posterUri}}
                    style={info.itemStyles}
                    placeholderContentFit='cover'
                />
            );
        }

        return null;
    }, [item]);

    const onRenderPage = useCallback((props: GalleryPagerItem, idx: number) => {
        switch (props.item.type) {
            case 'video':
                return (
                    <VideoRenderer
                        {...props}
                        index={idx}
                        initialIndex={initialIndex}
                        hideHeaderAndFooter={hideHeaderAndFooter}
                    />
                );
            case 'file':
                return (
                    <DocumentRenderer
                        item={props.item}
                        hideHeaderAndFooter={hideHeaderAndFooter}
                    />
                );
            default:
                return null;
        }
    }, []);

    const source = useMemo(() => {
        if (isGif(fileInfo) && fileInfo.id && !fileInfo.id.startsWith('uid')) {
            return buildFilePreviewUrl(serverUrl, fileInfo.id);
        }

        return fileInfo.localPath || fileInfo.uri || item.uri;
    }, [fileInfo, item.uri, serverUrl]);

    return (
        <LightboxSwipeout
            headerAndFooterHidden={headerAndFooterHidden}
            ref={lightboxRef}
            target={item}
            onAnimationFinished={hideLightboxItem}
            sharedValues={sharedValues}
            source={source}
            onSwipeActive={onSwipeActive}
            onSwipeFailure={onSwipeFailure}
            renderBackdropComponent={renderBackdropComponent}
            targetDimensions={targetDimensions}
            renderItem={onRenderItem}
        >
            <GalleryViewer
                items={items}
                onIndexChange={onIndexChangeWorklet}
                hideHeaderAndFooter={hideHeaderAndFooter}
                height={targetDimensions.height}
                width={targetDimensions.width}
                initialIndex={initialIndex}
                numToRender={1}
                renderPage={onRenderPage}
            />
        </LightboxSwipeout>
    );
});

Gallery.displayName = 'Gallery';

export default Gallery;
