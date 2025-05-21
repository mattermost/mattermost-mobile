// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture, type GestureUpdateEvent, type PinchGestureHandlerEventPayload} from 'react-native-gesture-handler';
import {cancelAnimation, useSharedValue, withTiming} from 'react-native-reanimated';

import {MAX_SCALE, MIN_SCALE, OVER_SCALE} from '@constants/gallery';
import {transformerTimingConfig} from '@screens/gallery/animation_config/timing';
import {clamp} from '@utils/gallery';
import * as vec from '@utils/gallery/vectors';

import {useTransformerSharedValues} from '../context';

export default function useTransformerPinchGesture(enabled: boolean) {
    // Get all the shared animated values and helpers from context
    const {
        interactionsEnabled,
        isPagerInProgress,
        offset,
        canvas,
        image,
        scale,
        scaleOffset,
        scaleTranslation,
        maybeRunOnEnd,
        resetSharedState,
    } = useTransformerSharedValues();

    // These vectors and values help track the pinch gesture state
    const origin = vec.useSharedVector(0, 0); // Where the pinch started, relative to image center
    const adjustedFocal = vec.useSharedVector(0, 0); // The focal point, adjusted to image/canvas
    const pinchGestureScale = useSharedValue(1); // The current scale from the pinch gesture
    const pinchNextScale = useSharedValue(1); // The next scale value to apply

    // Helper to decide if we should handle this pinch event
    const shouldHandleEvent = (evt: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
        'worklet';

        // Only handle if two fingers, interactions are enabled, and not paging
        return evt.numberOfPointers === 2 && interactionsEnabled.value && !isPagerInProgress.value;
    };

    return Gesture.Pinch().
        enabled(enabled).
        onStart((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }

            // Stop any ongoing pan/zoom animations
            cancelAnimation(offset.x);
            cancelAnimation(offset.y);

            // Calculate the image's position in the canvas (centered)
            const currentOffset = vec.create(offset.x.value, offset.y.value);
            const imageLeft = ((canvas.x - image.x) / 2) + currentOffset.x;
            const imageTop = ((canvas.y - image.y) / 2) + currentOffset.y;
            const imageRight = imageLeft + image.x;
            const imageBottom = imageTop + image.y;

            // Clamp the pinch focal point so it never goes outside the image
            // This prevents zooming on blank space from moving the image out of view
            const clampedFocalX = Math.max(imageLeft, Math.min(evt.focalX, imageRight));
            const clampedFocalY = Math.max(imageTop, Math.min(evt.focalY, imageBottom));

            // Calculate the focal point relative to the image center
            const focal = vec.create(clampedFocalX, clampedFocalY);
            const center = vec.divide(canvas, 2);

            // Set the adjusted focal and origin for the pinch gesture
            vec.set(adjustedFocal, vec.sub(focal, vec.add(center, offset)));
            vec.set(origin, adjustedFocal);
        }).
        onUpdate((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }

            // Calculate the next scale value, clamped to allowed min/max
            pinchNextScale.value = clamp(evt.scale * scaleOffset.value, MIN_SCALE, MAX_SCALE + OVER_SCALE);
            if (pinchNextScale.value > MIN_SCALE && pinchNextScale.value < MAX_SCALE + OVER_SCALE) {
                pinchGestureScale.value = evt.scale;
            }

            // Calculate how much the image should translate as the pinch gesture moves
            const pinch = vec.sub(adjustedFocal, origin);
            const nextTranslation = vec.add(pinch, origin, vec.multiply(-1, pinchGestureScale.value, origin));

            // Apply the translation and scale for the pinch
            vec.set(scaleTranslation, nextTranslation);
            scale.value = pinchNextScale.value;
        }).
        onEnd(() => {
            // When the pinch ends, update the scale and offset to their final values
            scaleOffset.value = scale.value;

            // If the scale is less than or equal to 1, reset everything to the initial state
            if (scaleOffset.value <= 1) {
                scaleOffset.value = 1;
                scale.value = withTiming(1, transformerTimingConfig);
                vec.set(offset, 0);
                vec.set(scaleTranslation, 0);
                resetSharedState(true);
            } else if (scaleOffset.value > MAX_SCALE) {
                // If the scale is too large, clamp it to the max allowed
                scaleOffset.value = MAX_SCALE;
                scale.value = withTiming(MAX_SCALE, transformerTimingConfig);
                vec.set(offset, vec.add(offset, scaleTranslation));
                vec.set(scaleTranslation, 0);
            } else {
                // Otherwise, just apply the translation and clear it
                vec.set(offset, vec.add(offset, scaleTranslation));
                vec.set(scaleTranslation, 0);
            }

            // Run the logic to "settle" the image in a natural way (e.g., spring back if needed)
            maybeRunOnEnd();
        });
}
