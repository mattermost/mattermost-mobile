// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture, type GestureUpdateEvent, type TapGestureHandlerEventPayload} from 'react-native-gesture-handler';
import {cancelAnimation} from 'react-native-reanimated';

import {useTransformerSharedValues} from '../context';

export function useTransformerSingleTap(enabled: boolean) {
    const {interactionsEnabled, isPagerInProgress, offset, scale, maybeRunOnEnd} = useTransformerSharedValues();

    const shouldHandleEvent = (evt: GestureUpdateEvent<TapGestureHandlerEventPayload>) => {
        'worklet';
        return evt.numberOfPointers === 1 && interactionsEnabled.value && scale.value === 1 && !isPagerInProgress.value;
    };

    return Gesture.Tap().
        enabled(enabled).
        onStart((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }
            cancelAnimation(offset.x);
            cancelAnimation(offset.y);
        }).
        onEnd((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }
            maybeRunOnEnd();
        });
}
