// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture, type GestureStateChangeEvent, type GestureUpdateEvent, type PanGestureHandlerEventPayload} from 'react-native-gesture-handler';
import {useSharedValue, withSpring} from 'react-native-reanimated';

import {MAX_VELOCITY, MIN_VELOCITY} from '@constants/gallery';
import {pagerPanSpringConfig} from '@screens/gallery/animation_config/spring';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';
import {clampVelocity, friction} from '@utils/gallery';

import {usePagerSharedValues} from '../context';

export default function usePagerPanGesture() {
    const {
        isActive,
        isPagerInProgress,
        velocity,
        getCanSwipe,
        getNextIndex,
        pagerX,
        sharedWidth,
        toValueAnimation,
        getPageTranslate,
        index,
        onIndexChange,
    } = usePagerSharedValues();
    const {allowsOtherGestures} = useLightboxSharedValues();

    const offset = useSharedValue<number | null>(null);

    const shouldHandleEvent = (evt: GestureStateChangeEvent<PanGestureHandlerEventPayload> | GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
        'worklet';
        return (
            allowsOtherGestures() &&
                evt.numberOfPointers === 1 &&
                isActive.value &&
                Math.abs(evt.velocityX) > Math.abs(evt.velocityY)
        ) || isPagerInProgress.value;
    };

    return Gesture.Pan().
        minDistance(5).
        minVelocityX(0.1).
        shouldCancelWhenOutside(false).
        onStart((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }
            offset.value = evt.translationX;
        }).
        onUpdate((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }
            velocity.value = clampVelocity(
                evt.velocityX,
                MIN_VELOCITY,
                MAX_VELOCITY,
            );

            if (offset.value === null) {
                offset.value = evt.translationX < 0 ? evt.translationX : -evt.translationX;
            }

            const val = evt.translationX - offset.value;
            const canSwipe = getCanSwipe(val);
            pagerX.value = canSwipe ? val : friction(val);
        }).
        onEnd((evt) => {
            if (!shouldHandleEvent(evt)) {
                return;
            }
            const val = evt.translationX - offset.value!;
            const nextIndex = getNextIndex(evt.velocityX);
            const vx = Math.abs(evt.velocityX);
            const canSwipe = getCanSwipe(val);
            const translation = Math.abs(val);
            const isHalf = sharedWidth.value / 3 < translation;
            const shouldMoveToNextPage = (vx > 400 || isHalf) && canSwipe;

            const spring = pagerPanSpringConfig(evt);

            pagerX.value = withSpring(0, spring);
            offset.value = null;

            toValueAnimation.value = -(shouldMoveToNextPage ? -getPageTranslate(nextIndex) : -getPageTranslate(index.value));

            if (shouldMoveToNextPage) {
                index.value = nextIndex;
                onIndexChange(nextIndex);
            }
        });
}
