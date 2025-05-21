// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';

import * as vec from '@utils/gallery/vectors';
import {calculateDimensions} from '@utils/images';

import {TransfrormerProvider, type TransformerSharedValues} from './context';
import ImageTransformer from './transformer';

import type {GalleryPagerItem} from '@typings/screens/gallery';

function ImageRenderer({
    height,
    isPageActive,
    isPagerInProgress,
    item,
    onPageStateChange,
    width,
    pagerPanGesture,
    pagerTapGesture,
    lightboxPanGesture,
}: GalleryPagerItem) {
    const windowDimensions = useWindowDimensions();
    const targetDimensions = useMemo(() => ({height, width}), [height, width]);
    const interactionsEnabled = useSharedValue(false);
    const scale = useSharedValue(1);
    const scaleOffset = useSharedValue(1);
    const translation = vec.useSharedVector(0, 0);
    const panVelocity = vec.useSharedVector(0, 0);
    const scaleTranslation = vec.useSharedVector(0, 0);
    const offset = vec.useSharedVector(0, 0);
    const canvas = vec.create(windowDimensions.width, windowDimensions.height);
    const {width: targetWidth, height: targetHeight} = useMemo(() => calculateDimensions(
        item.height,
        item.width,
        targetDimensions.width,
        targetDimensions.height,
        true,
    ), [item.width, item.height, targetDimensions.width, targetDimensions.height]);
    const image = vec.create(targetWidth, targetHeight);

    const sharedValues: TransformerSharedValues = useMemo(() => ({
        interactionsEnabled,
        isPagerInProgress,
        scale,
        scaleOffset,
        translation,
        panVelocity,
        offset,
        scaleTranslation,
        canvas,
        image,
        targetDimensions,
        targetHeight,

    // the rest of the values are shared values,
    // so they don't need to be included in the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [targetDimensions, targetHeight, canvas]);

    return (
        <TransfrormerProvider sharedValues={sharedValues}>
            <ImageTransformer
                isPageActive={isPageActive}
                targetDimensions={targetDimensions}
                height={targetHeight}
                isSvg={item.extension === 'svg'}
                onPageStateChange={onPageStateChange}
                source={item.uri}
                width={targetWidth}
                pagerPanGesture={pagerPanGesture}
                pagerTapGesture={pagerTapGesture}
                lightboxPanGesture={lightboxPanGesture}
            />
        </TransfrormerProvider>
    );
}

export default ImageRenderer;
