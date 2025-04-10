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
    const {
        interactionsEnabled,
        isPagerInProgress,
        offset,
        canvas,
        scale,
        scaleOffset,
        scaleTranslation,
        maybeRunOnEnd,
    } = useTransformerSharedValues();
    const origin = vec.useSharedVector(0, 0);
    const adjustedFocal = vec.useSharedVector(0, 0);
    const pinchGestureScale = useSharedValue(1);
    const pinchNextScale = useSharedValue(1);

    const shouldHandleEvent = (evt: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
        'worklet';
        return evt.numberOfPointers === 2 && interactionsEnabled.value && !isPagerInProgress.value;
    };

    return Gesture.Pinch().
        enabled(enabled).
        onStart((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }

            cancelAnimation(offset.x);
            cancelAnimation(offset.y);

            const focal = vec.create(evt.focalX, evt.focalY);
            const center = vec.divide(canvas, 2);

            vec.set(adjustedFocal, vec.sub(focal, vec.add(center, offset)));
            vec.set(origin, adjustedFocal);
        }).
        onUpdate((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }

            pinchNextScale.value = clamp(evt.scale * scaleOffset.value, MIN_SCALE, MAX_SCALE + OVER_SCALE);
            if (pinchNextScale.value > MIN_SCALE && pinchNextScale.value < MAX_SCALE + OVER_SCALE) {
                pinchGestureScale.value = evt.scale;
            }

            const pinch = vec.sub(adjustedFocal, origin);
            const nextTranslation = vec.add(pinch, origin, vec.multiply(-1, pinchGestureScale.value, origin));

            vec.set(scaleTranslation, nextTranslation);
            scale.value = pinchNextScale.value;
        }).
        onEnd((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }

            scaleOffset.value = scale.value;
            if (scaleOffset.value < 1) {
                scaleOffset.value = 1;
                scale.value = withTiming(1, transformerTimingConfig);
            } else if (scaleOffset.value > MAX_SCALE) {
                scaleOffset.value = MAX_SCALE;
                scale.value = withTiming(MAX_SCALE, transformerTimingConfig);
            }

            vec.set(offset, vec.add(offset, scaleTranslation));
            vec.set(scaleTranslation, 0);
            maybeRunOnEnd();
        });
}
