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

    // This derived value tells us if the image can be panned vertically (if the scaled image is taller than the viewport)
    const canPanVertically = useDerivedValue(() => {
        return targetDimensions.height < targetHeight * scale.value;
    }, []);

    // Handles double-tap zoom logic, keeping the tapped point under the finger and preventing blank space
    function handleScaleTo(x: number, y: number) {
        'worklet';

        const previousScale = scale.value;
        const nextScale = DOUBLE_TAP_SCALE;
        const scaleFactor = nextScale / previousScale;

        scale.value = withTiming(nextScale, transformerTimingConfig);
        scaleOffset.value = nextScale;

        // Calculate the new image size after scaling
        const newImageSize = vec.multiply(image, nextScale);

        // Get the current pan offset
        const currentOffset = vec.create(offset.x.value, offset.y.value);

        // Calculate the image's position in the canvas (centered)
        const imageLeft = ((canvas.x - image.x) / 2) + currentOffset.x;
        const imageTop = ((canvas.y - image.y) / 2) + currentOffset.y;
        const imageRight = imageLeft + image.x;
        const imageBottom = imageTop + image.y;

        // Clamp the tap point to the image bounds so we never zoom to blank space
        const clampedX = Math.max(imageLeft, Math.min(x, imageRight));
        const clampedY = Math.max(imageTop, Math.min(y, imageBottom));

        // Calculate how far the tap is from the image center
        const focalRelativeToCenter = vec.sub(
            vec.create(clampedX, clampedY),
            vec.create((canvas.x / 2) + currentOffset.x, (canvas.y / 2) + currentOffset.y),
        );

        // Calculate how much that distance changes after scaling
        const scaledFocal = vec.multiply(focalRelativeToCenter, scaleFactor);

        // Calculate the new offset so the tapped point stays under the finger
        const newOffset = vec.add(
            currentOffset,
            vec.sub(focalRelativeToCenter, scaledFocal),
        );

        // For tall images, reduce vertical drift a bit
        if (newImageSize.y > canvas.y) {
            newOffset.y *= 0.85;
        }

        // Calculate the offset needed to center the focal point after scaling
        let targetOffsetX = (canvas.x / 2) - (((clampedX - imageLeft) * scaleFactor) + ((canvas.x - newImageSize.x) / 2));
        let targetOffsetY = (canvas.y / 2) - (((clampedY - imageTop) * scaleFactor) + ((canvas.y - newImageSize.y) / 2));

        // Don't allow the image to pan so far that blank space appears
        const maxOffsetX = Math.max(0, (newImageSize.x - canvas.x) / 2);
        const maxOffsetY = Math.max(0, (newImageSize.y - canvas.y) / 2);

        targetOffsetX = clamp(targetOffsetX, -maxOffsetX, maxOffsetX);
        targetOffsetY = clamp(targetOffsetY, -maxOffsetY, maxOffsetY);

        // Animate the image to the new offset
        offset.x.value = withTiming(targetOffsetX, transformerTimingConfig);
        offset.y.value = withTiming(targetOffsetY, transformerTimingConfig);

        // The following block tries to ensure the focal point is visible after zooming.
        // It adjusts the offset if the focal point is outside the canvas after the initial calculation.
        const zoomedImageLeft = ((canvas.x - newImageSize.x) / 2) + newOffset.x;
        const zoomedImageTop = ((canvas.y - newImageSize.y) / 2) + newOffset.y;
        const focalXInCanvas = ((clampedX - imageLeft) * scaleFactor) + zoomedImageLeft;
        const focalYInCanvas = ((clampedY - imageTop) * scaleFactor) + zoomedImageTop;

        let adjustX = 0;
        let adjustY = 0;
        if (focalXInCanvas < 0) {
            adjustX = -focalXInCanvas;
        } else if (focalXInCanvas > canvas.x) {
            adjustX = canvas.x - focalXInCanvas;
        }
        if (focalYInCanvas < 0) {
            adjustY = -focalYInCanvas;
        } else if (focalYInCanvas > canvas.y) {
            adjustY = canvas.y - focalYInCanvas;
        }

        // If adjustment is needed, apply it and clamp again to keep the image within bounds
        if (adjustX !== 0 || adjustY !== 0) {
            newOffset.x = clamp(newOffset.x + adjustX, -maxOffsetX, maxOffsetX);
            newOffset.y = clamp(newOffset.y + adjustY, -maxOffsetY, maxOffsetY);

            // Recalculate focal point position after adjustment and clamp again if needed
            const zoomedImageLeft2 = ((canvas.x - newImageSize.x) / 2) + newOffset.x;
            const zoomedImageTop2 = ((canvas.y - newImageSize.y) / 2) + newOffset.y;
            const focalXInCanvas2 = ((clampedX - imageLeft) * scaleFactor) + zoomedImageLeft2;
            const focalYInCanvas2 = ((clampedY - imageTop) * scaleFactor) + zoomedImageTop2;

            if (focalXInCanvas2 < 0) {
                newOffset.x = clamp(newOffset.x - focalXInCanvas2, -maxOffsetX, maxOffsetX);
            } else if (focalXInCanvas2 > canvas.x) {
                newOffset.x = clamp(newOffset.x + (canvas.x - focalXInCanvas2), -maxOffsetX, maxOffsetX);
            }
            if (focalYInCanvas2 < 0) {
                newOffset.y = clamp(newOffset.y - focalYInCanvas2, -maxOffsetY, maxOffsetY);
            } else if (focalYInCanvas2 > canvas.y) {
                newOffset.y = clamp(newOffset.y + (canvas.y - focalYInCanvas2), -maxOffsetY, maxOffsetY);
            }

            offset.x.value = withTiming(newOffset.x, transformerTimingConfig);
            offset.y.value = withTiming(newOffset.y, transformerTimingConfig);
        }
    }

    // This function is called at the end of a pan or zoom gesture to "settle" the image in a natural way
    function maybeRunOnEnd() {
        'worklet';

        // Target is the centered position (no offset)
        const target = vec.create(0, 0);

        // Clamp the scale to allowed min/max
        const fixedScale = clamp(MIN_SCALE, scale.value, MAX_SCALE);

        // Calculate the scaled image height
        const scaledImage = (targetHeight * fixedScale);

        // Calculate how far the image can move horizontally
        const rightBoundary = (canvas.x / 2) * (fixedScale - 1);

        let topBoundary = 0;

        // If the image is taller than the canvas, calculate how far it can move vertically
        if (canvas.y < scaledImage) {
            topBoundary = Math.abs(scaledImage - canvas.y) / 2;
        }

        // These vectors represent the max and min allowed pan positions
        const maxVector = vec.create(rightBoundary, topBoundary);
        const minVector = vec.invert(maxVector);

        // If the image can't be panned vertically, animate it back to center vertically
        if (!canPanVertically.value) {
            offset.y.value = withSpring(target.y, transformerSpringConfig);
        }

        // If everything is already centered and not zoomed, no need to animate
        if (
            vec.eq(offset, 0) &&
            vec.eq(translation, 0) &&
            vec.eq(scaleTranslation, 0) &&
            scale.value === 1
        ) {
            return;
        }

        // If zoomed out, animate everything back to center
        if (scale.value <= 1) {
            vec.set(offset, () => withTiming(0, transformerTimingConfig));
            return;
        }

        // Clamp the offset to the allowed pan range
        vec.set(target, vec.clamp(offset, minVector, maxVector));

        const deceleration = 0.998;

        // If already at the horizontal boundary, allow a decay animation for a natural feel
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

        // If already at the vertical boundary, allow a decay animation for a natural feel
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

    // Resets all shared values to their initial state, optionally with animation
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
