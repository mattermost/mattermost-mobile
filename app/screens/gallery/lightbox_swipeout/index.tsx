// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ImageSource} from 'expo-image';
import React, {forwardRef, useImperativeHandle, useMemo} from 'react';
import {type ImageSize, type ImageStyle, type ViewStyle} from 'react-native';
import {
    cancelAnimation,
    useAnimatedReaction, useSharedValue, withTiming,
    type SharedValue,
} from 'react-native-reanimated';

import {pagerTimingConfig} from '@screens/gallery/animation_config/timing';

import {LightboxProvider, type LightboxSharedValues} from './context';
import Lightbox from './lightbox';

import type {BackdropProps} from './backdrop';
import type {GalleryItemType, GalleryManagerSharedValues} from '@typings/screens/gallery';

export interface RenderItemInfo {
    source: ImageSource;
    width: number;
    height: number;
    itemStyles: ViewStyle | ImageStyle;
}

interface LightboxSwipeoutProps {
    children: React.ReactNode;
    headerAndFooterHidden: SharedValue<boolean>;
    onAnimationFinished: () => void;
    onSwipeActive: (translateY: number) => void;
    onSwipeFailure: () => void;
    renderBackdropComponent?: (info: BackdropProps) => JSX.Element;
    renderItem: (info: RenderItemInfo) => JSX.Element | null;
    sharedValues: GalleryManagerSharedValues;
    source: ImageSource | string;
    target: GalleryItemType;
    targetDimensions: ImageSize;
}

export interface LightboxSwipeoutRef {
    closeLightbox: () => void;
}

const LightboxSwipeout = forwardRef<LightboxSwipeoutRef, LightboxSwipeoutProps>(({
    onAnimationFinished, children, headerAndFooterHidden, onSwipeActive, onSwipeFailure,
    renderBackdropComponent, renderItem,
    sharedValues, source, target, targetDimensions,
}: LightboxSwipeoutProps, ref) => {
    const {x, y, opacity} = sharedValues;
    const animationProgress = useSharedValue(0);
    const childTranslateY = useSharedValue(0);
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const lightboxImageOpacity = useSharedValue(1);
    const childrenOpacity = useSharedValue(0);

    const shouldHandleEvent = () => {
        'worklet';

        return childTranslateY.value === 0;
    };

    const closeLightbox = () => {
        'worklet';

        lightboxImageOpacity.value = 1;
        childrenOpacity.value = 0;
        animationProgress.value = withTiming(
            0,
            pagerTimingConfig,
            () => {
                'worklet';

                opacity.value = 1;
                onAnimationFinished();
            },
        );
    };

    useAnimatedReaction(
        () => childTranslateY.value,
        (value) => {
            if (Math.abs(value) >= target.height + 100) {
                cancelAnimation(childTranslateY);
            }
        },
    );

    useImperativeHandle(ref, () => ({
        closeLightbox,
    }));

    const isVisibleImage = () => {
        'worklet';

        return (
            targetDimensions.height >= y.value &&
            targetDimensions.width >= x.value &&
            x.value >= 0 &&
            y.value >= 0
        );
    };

    const lightboxSharedValues: LightboxSharedValues = useMemo(() => ({
        headerAndFooterHidden,
        animationProgress,
        childrenOpacity,
        childTranslateY,
        imageOpacity: lightboxImageOpacity,
        opacity,
        scale,
        translateX,
        translateY,
        target,
        targetDimensions,
        allowsOtherGestures: shouldHandleEvent,
        isVisibleImage,
        onAnimationFinished,
        onSwipeActive,
        onSwipeFailure,

    // The remaining dependencies does not need to be added as they
    // are already included in the sharedValues object
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [target, targetDimensions, shouldHandleEvent, isVisibleImage, onAnimationFinished, onSwipeActive, onSwipeFailure]);

    return (
        <LightboxProvider sharedValues={lightboxSharedValues}>
            <Lightbox
                renderBackdropComponent={renderBackdropComponent}
                renderItem={renderItem}
                sharedValues={sharedValues}
                source={source}
            >
                {children}
            </Lightbox>
        </LightboxProvider>
    );
});

LightboxSwipeout.displayName = 'LightboxSwipeout';

export default LightboxSwipeout;
