// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture} from 'react-native-gesture-handler';
import {cancelAnimation} from 'react-native-reanimated';

import * as vec from '@utils/gallery/vectors';

import {useTransformerSharedValues} from '../context';

const panMultiplier = 1.3;

export default function useTransformerPanGesture(enabled: boolean) {
    const {
        interactionsEnabled,
        isPagerInProgress,
        offset,
        translation,
        scale,
        maybeRunOnEnd,
        panVelocity,
    } = useTransformerSharedValues();
    const panOffset = vec.useSharedVector(0, 0);

    const shouldHandleEvent = () => {
        'worklet';
        return scale.value > 1 && interactionsEnabled.value && !isPagerInProgress.value;
    };

    return Gesture.Pan().
        enabled(enabled).
        minDistance(4).
        onBegin(() => {
            if (!shouldHandleEvent()) {
                return;
            }
            cancelAnimation(offset.x);
            cancelAnimation(offset.y);
            vec.set(panOffset, 0);
        }).
        onUpdate((evt) => {
            if (!shouldHandleEvent()) {
                return;
            }
            const pan = vec.create(evt.translationX * panMultiplier, evt.translationY * panMultiplier);
            const velocity = vec.create(evt.velocityX, evt.velocityY);
            vec.set(panVelocity, velocity);

            // Apply calculated translation with offset correction
            const nextTranslate = vec.add(pan, vec.invert(panOffset));
            translation.x.value = nextTranslate.x;
            translation.y.value = nextTranslate.y;
        }).
        onEnd((evt) => {
            if (!shouldHandleEvent()) {
                return;
            }
            vec.set(offset, vec.add(offset, translation));
            vec.set(translation, 0);
            vec.set(panOffset, 0);

            maybeRunOnEnd();

            vec.set(panVelocity, vec.create(evt.velocityX, evt.velocityY));
        });
}
