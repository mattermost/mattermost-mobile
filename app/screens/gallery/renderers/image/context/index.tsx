// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';
import {useDerivedValue, withDecay, withSpring, withTiming, type SharedValue} from 'react-native-reanimated';

import {DOUBLE_TAP_SCALE, MAX_SCALE, MIN_SCALE} from '@constants/gallery';
import {transformerSpringConfig} from '@screens/gallery/animation_config/spring';
import {transformerTimingConfig} from '@screens/gallery/animation_config/timing';
import {clamp} from '@utils/gallery';
import * as vec from '@utils/gallery/vectors';

import type {WindowDimensions} from '@mattermost/rnutils';

export type TransformerSharedValues = {
    isPagerInProgress: SharedValue<boolean>;
    interactionsEnabled: SharedValue<boolean>;
    scale: SharedValue<number>;
    scaleOffset: SharedValue<number>;
    translation: vec.ShareVectorType<number>;
    panVelocity: vec.ShareVectorType<number>;
    scaleTranslation: vec.ShareVectorType<number>;
    offset: vec.ShareVectorType<number>;
    canvas: vec.Vector<number>;
    image: vec.Vector<number>;
    targetDimensions: WindowDimensions;
    targetHeight: number;
};

const TransformerContext = React.createContext<TransformerSharedValues | null>(null);

export const TransfrormerProvider: React.FC<{sharedValues: TransformerSharedValues; children: React.ReactNode}> = ({children, sharedValues}) => {
    return (
        <TransformerContext.Provider value={sharedValues}>
            {children}
        </TransformerContext.Provider>
    );
};

export const useTransformerSharedValues = () => {
    const context = useContext(TransformerContext);
    if (!context) {
        throw new Error('useTransformerSharedValues must be used within a TransformerProvider');
    }

    const {
        canvas, image, offset, panVelocity, scale, scaleOffset, scaleTranslation,
        targetDimensions, targetHeight, translation,
    } = context;

    const canPanVertically = useDerivedValue(() => {
        return targetDimensions.height < targetHeight * scale.value;
    }, []);

    function handleScaleTo(x: number, y: number) {
        'worklet';

        const previousScale = scale.value;
        const nextScale = DOUBLE_TAP_SCALE; // Target scale after double tap

        // Compute scale factor
        const scaleFactor = nextScale / previousScale;

        // Apply scale animation
        scale.value = withTiming(nextScale, transformerTimingConfig);
        scaleOffset.value = nextScale;

        // Compute new image size after scaling
        const newImageSize = vec.multiply(image, nextScale);

        // Get the current offset
        const currentOffset = vec.create(offset.x.value, offset.y.value);

        // Compute image center BEFORE scaling
        const imageCenter = vec.divide(image, 2);
        const imageCenterInCanvas = vec.add(imageCenter, currentOffset);

        // **Clamp focal point to be inside the image bounds**
        const clampedX = Math.min(Math.max(x, currentOffset.x), currentOffset.x + image.x);
        const clampedY = Math.min(Math.max(y, currentOffset.y), currentOffset.y + image.y);

        // Compute how far the (clamped) tap point is from the image center
        const focalRelativeToCenter = vec.sub(vec.create(clampedX, clampedY), imageCenterInCanvas);

        // Scale this distance
        const scaledFocal = vec.multiply(focalRelativeToCenter, scaleFactor);

        // Compute new offset by adjusting for scaled focal point
        const newOffset = vec.add(
            currentOffset,
            vec.sub(focalRelativeToCenter, scaledFocal),
        );

        // **Fix for Portrait Mode: Reduce Vertical Drift**
        if (newImageSize.y > canvas.y) {
            newOffset.y *= 0.85; // Minor correction for portrait images
        }

        // Ensure offsets remain within bounds
        if (newImageSize.y < canvas.y) {
            newOffset.y = 0;
        }
        if (newImageSize.x < canvas.x) {
            newOffset.x = 0;
        }

        // Animate to the new offset position
        offset.x.value = withTiming(newOffset.x, transformerTimingConfig);
        offset.y.value = withTiming(newOffset.y, transformerTimingConfig);
    }

    function maybeRunOnEnd() {
        'worklet';

        const target = vec.create(0, 0);

        const fixedScale = clamp(MIN_SCALE, scale.value, MAX_SCALE);
        const scaledImage = (targetHeight * fixedScale);
        const rightBoundary = (canvas.x / 2) * (fixedScale - 1);

        let topBoundary = 0;

        if (canvas.y < scaledImage) {
            topBoundary = Math.abs(scaledImage - canvas.y) / 2;
        }

        const maxVector = vec.create(rightBoundary, topBoundary);
        const minVector = vec.invert(maxVector);

        if (!canPanVertically.value) {
            offset.y.value = withSpring(target.y, transformerSpringConfig);
        }

        if (
            vec.eq(offset, 0) &&
                    vec.eq(translation, 0) &&
                    vec.eq(scaleTranslation, 0) &&
                    scale.value === 1
        ) {
            // we don't need to run any animations
            return;
        }

        if (scale.value <= 1) {
            // just center it
            vec.set(offset, () => withTiming(0, transformerTimingConfig));
            return;
        }

        vec.set(target, vec.clamp(offset, minVector, maxVector));

        const deceleration = 0.998;

        const isInBoundaryX = target.x === offset.x.value;
        const isInBoundaryY = target.y === offset.y.value;

        if (isInBoundaryX) {
            if (
                Math.abs(panVelocity.x.value) > 0 &&
                        scale.value <= MAX_SCALE
            ) {
                offset.x.value = withDecay({
                    velocity: panVelocity.x.value,
                    velocityFactor: 1.5,
                    clamp: [minVector.x, maxVector.x],
                    deceleration,
                });
            }
        } else {
            offset.x.value = withSpring(target.x, transformerSpringConfig);
        }

        if (isInBoundaryY) {
            if (
                Math.abs(panVelocity.y.value) > 0 &&
                        scale.value <= MAX_SCALE &&
                        offset.y.value !== minVector.y &&
                        offset.y.value !== maxVector.y
            ) {
                offset.y.value = withDecay({
                    velocity: panVelocity.y.value,
                    velocityFactor: 1.5,
                    clamp: [minVector.y, maxVector.y],
                    deceleration,
                });
            }
        } else {
            offset.y.value = withSpring(target.y, transformerSpringConfig);
        }
    }

    function resetSharedState(animated?: boolean) {
        'worklet';

        if (animated) {
            scale.value = withTiming(1, transformerTimingConfig);
            scaleOffset.value = 1;

            vec.set(offset, () => withTiming(0, transformerTimingConfig));
            vec.set(translation, () => withTiming(0, transformerTimingConfig));
            vec.set(scaleTranslation, () => withTiming(0, transformerTimingConfig));
        } else {
            scale.value = 1;
            scaleOffset.value = 1;
            vec.set(translation, 0);
            vec.set(scaleTranslation, 0);
            vec.set(offset, 0);
        }
    }

    return {
        ...context,
        handleScaleTo,
        maybeRunOnEnd,
        resetSharedState,
    };
};
