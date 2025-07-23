// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture, type GestureUpdateEvent, type TapGestureHandlerEventPayload} from 'react-native-gesture-handler';

import {useTransformerSharedValues} from '../context';

export default function useTransformerDoubleTap(enabled: boolean) {
    const {interactionsEnabled, isPagerInProgress, scale, resetSharedState, handleScaleTo} = useTransformerSharedValues();

    const shouldHandleEvent = (evt: GestureUpdateEvent<TapGestureHandlerEventPayload>) => {
        'worklet';
        return evt.numberOfPointers === 1 && interactionsEnabled.value && !isPagerInProgress.value;
    };

    return Gesture.Tap().
        enabled(enabled).
        numberOfTaps(2).
        maxDuration(500).
        maxDeltaX(16).
        maxDeltaY(16).
        onStart((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }

            if (scale.value > 1) {
                resetSharedState(true);
            } else {
                handleScaleTo(evt.x, evt.y);
            }
        });
}
