// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, type ImageSource} from 'expo-image';
import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedReaction, useAnimatedStyle} from 'react-native-reanimated';
import {SvgUri} from 'react-native-svg';

import {useTransformerSharedValues} from './context';
import useTransformerDoubleTap from './gestures/useTransformerDoubleTap';
import useTransformerPanGesture from './gestures/useTransformerPanGesture';
import useTransformerPinchGesture from './gestures/useTransformerPinchGesture';
import {useTransformerSingleTap} from './gestures/useTransformerSingleTap';

import type {GalleryPagerItem} from '@typings/screens/gallery';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    wrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    svg: {
        backgroundColor: '#FFF',
        borderRadius: 8,
    },
});

interface ImageTransformerProps extends Omit<GalleryPagerItem, 'index' | 'item' | 'isPagerInProgress'> {
    enabled?: boolean;
    isSvg: boolean;
    source: ImageSource | string;
    targetDimensions: { width: number; height: number };
}

const ImageTransformer = (
    {
        enabled = true, height, isPageActive,
        onPageStateChange, source, isSvg,
        targetDimensions, width, pagerPanGesture, pagerTapGesture, lightboxPanGesture,
    }: ImageTransformerProps) => {
    const imageSource = typeof source === 'string' ? {uri: source} : source;
    const {
        interactionsEnabled,
        scale,
        translation,
        scaleTranslation,
        offset,
        resetSharedState,
    } = useTransformerSharedValues();

    const setInteractionsEnabled = useCallback((value: boolean) => {
        interactionsEnabled.value = value;
    }, []);

    const onLoadImageSuccess = useCallback(() => {
        setInteractionsEnabled(true);
    }, []);

    useAnimatedReaction(
        () => {
            if (typeof isPageActive === 'undefined') {
                return true;
            }

            return isPageActive.value;
        },
        (currentActive) => {
            if (!currentActive) {
                resetSharedState();
            }
        },
    );

    const animatedStyles = useAnimatedStyle(() => {
        const noOffset = offset.x.value === 0 && offset.y.value === 0;
        const noTranslation = translation.x.value === 0 && translation.y.value === 0;
        const noScaleTranslation = scaleTranslation.x.value === 0 && scaleTranslation.y.value === 0;
        const isInactive = scale.value === 1 && noOffset && noTranslation && noScaleTranslation;

        onPageStateChange(isInactive);

        return {
            transform: [
                {
                    translateX:
                            scaleTranslation.x.value +
                            translation.x.value +
                            offset.x.value,
                },
                {
                    translateY:
                            scaleTranslation.y.value +
                            translation.y.value +
                            offset.y.value,
                },
                {scale: scale.value},
            ],
        };
    }, []);

    const pinchGesture = useTransformerPinchGesture(true);
    pinchGesture.simultaneousWithExternalGesture(pagerPanGesture, lightboxPanGesture);

    const panGesture = useTransformerPanGesture(enabled);
    panGesture.simultaneousWithExternalGesture(pagerPanGesture, lightboxPanGesture);

    const doubleTapGesture = useTransformerDoubleTap(enabled);
    doubleTapGesture.blocksExternalGesture(pagerTapGesture);

    const tapGesture = useTransformerSingleTap(enabled);
    tapGesture.simultaneousWithExternalGesture(pagerTapGesture);

    const composedGesture = Gesture.Exclusive(
        Gesture.Simultaneous(pinchGesture, panGesture),
        doubleTapGesture,
        tapGesture,
    );

    let element;
    if (isSvg) {
        element = (
            <SvgUri
                uri={imageSource.uri!}
                style={styles.svg}
                width={Math.min(targetDimensions.width, targetDimensions.height)}
                height={Math.min(targetDimensions.width, targetDimensions.height)}
                onLayout={onLoadImageSuccess}
            />
        );
    } else {
        element = (
            <Image
                onLoad={onLoadImageSuccess}
                source={imageSource}
                style={{width, height}}
            />
        );
    }

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.container]}>
                <Animated.View style={[styles.wrapper, animatedStyles]}>
                    {element}
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
};

export default React.memo(ImageTransformer);

