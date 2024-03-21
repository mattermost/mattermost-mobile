// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {BackHandler} from 'react-native';
import FastImage, {type ImageStyle} from 'react-native-fast-image';
import Animated, {runOnJS, runOnUI, useAnimatedReaction, type AnimatedStyle} from 'react-native-reanimated';

import {useGallery} from '@context/gallery';
import {freezeOtherScreens, measureItem} from '@utils/gallery';

import DocumentRenderer from './document_renderer';
import LightboxSwipeout, {type LightboxSwipeoutRef, type RenderItemInfo} from './lightbox_swipeout';
import Backdrop, {type BackdropProps} from './lightbox_swipeout/backdrop';
import VideoRenderer from './video_renderer';
import GalleryViewer from './viewer';

import type {ImageRendererProps} from './image_renderer';
import type {GalleryItemType} from '@typings/screens/gallery';

const AnimatedImage = Animated.createAnimatedComponent(FastImage);

interface GalleryProps {
    galleryIdentifier: string;
    initialIndex: number;
    items: GalleryItemType[];
    onIndexChange?: (index: number) => void;
    onHide: () => void;
    targetDimensions: { width: number; height: number };
    onShouldHideControls: (hide: boolean) => void;
}

export interface GalleryRef {
    close: () => void;
}

const Gallery = forwardRef<GalleryRef, GalleryProps>(({
    galleryIdentifier,
    initialIndex,
    items,
    onHide,
    targetDimensions,
    onShouldHideControls,
    onIndexChange,
}: GalleryProps, ref) => {
    const {refsByIndexSV, sharedValues} = useGallery(galleryIdentifier);
    const [localIndex, setLocalIndex] = useState(initialIndex);
    const lightboxRef = useRef<LightboxSwipeoutRef>(null);
    const item = items[localIndex];

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

            if (index > -1 && galleryItems[index]) {
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
            onShouldHideControls(true);
        }
    }

    function onSwipeFailure() {
        'worklet';

        runOnJS(freezeOtherScreens)(true);
        onShouldHideControls(false);
    }

    function hideLightboxItem() {
        'worklet';

        sharedValues.width.value = 0;
        sharedValues.height.value = 0;
        sharedValues.opacity.value = 1;
        sharedValues.activeIndex.value = -1;
        sharedValues.x.value = 0;
        sharedValues.y.value = 0;

        runOnJS(onHide)();
    }

    const onRenderItem = useCallback((info: RenderItemInfo) => {
        if (item.type === 'video' && item.posterUri) {
            return (
                <AnimatedImage
                    source={{uri: item.posterUri}}
                    style={info.itemStyles as AnimatedStyle<ImageStyle>}
                />
            );
        }

        return null;
    }, [item]);

    const onRenderPage = useCallback((props: ImageRendererProps, idx: number) => {
        switch (props.item.type) {
            case 'video':
                return (
                    <VideoRenderer
                        {...props}
                        index={idx}
                        initialIndex={initialIndex}
                        onShouldHideControls={onShouldHideControls}
                    />
                );
            case 'file':
                return (
                    <DocumentRenderer
                        item={props.item}
                        onShouldHideControls={onShouldHideControls}
                    />
                );
            default:
                return null;
        }
    }, []);

    return (
        <LightboxSwipeout
            ref={lightboxRef}
            target={item}
            onAnimationFinished={hideLightboxItem}
            sharedValues={sharedValues}
            source={item.uri}
            onSwipeActive={onSwipeActive}
            onSwipeFailure={onSwipeFailure}
            renderBackdropComponent={renderBackdropComponent}
            targetDimensions={targetDimensions}
            renderItem={onRenderItem}
        >
            {({onGesture, shouldHandleEvent}) => (
                <GalleryViewer
                    items={items}
                    onIndexChange={onIndexChangeWorklet}
                    shouldPagerHandleGestureEvent={shouldHandleEvent}
                    onShouldHideControls={onShouldHideControls}
                    height={targetDimensions.height}
                    width={targetDimensions.width}
                    initialIndex={initialIndex}
                    onPagerEnabledGesture={onGesture}
                    numToRender={1}
                    renderPage={onRenderPage}
                />
            )}
        </LightboxSwipeout>
    );
});

Gallery.displayName = 'Gallery';

export default Gallery;
