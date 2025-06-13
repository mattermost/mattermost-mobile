// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture, type GestureUpdateEvent, type PanGestureHandlerEventPayload} from 'react-native-gesture-handler';
import {runOnJS, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';

import {pagerTimingConfig} from '@screens/gallery/animation_config/timing';
import {useLightboxSharedValues} from '@screens/gallery/lightbox_swipeout/context';
import {freezeOtherScreens} from '@utils/gallery';

import {usePagerSharedValues} from '../context';

export default function useLightboxPanGesture() {
    const {
        animationProgress,
        childrenOpacity,
        childTranslateY,
        imageOpacity,
        opacity,
        target,
        targetDimensions,
        isVisibleImage,
        onAnimationFinished,
        onSwipeActive,
        onSwipeFailure,
    } = useLightboxSharedValues();

    const {isActive, isPagerInProgress} = usePagerSharedValues();
    const isGestureActive = useSharedValue(false);

    const shouldAllowPanGesture = (evt: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
        'worklet';

        const shouldHandle = (
            evt.numberOfPointers <= 1 && isActive.value &&
            Math.abs(evt.velocityX) < Math.abs(evt.velocityY) &&
            Math.abs(evt.translationY) > Math.abs(evt.translationX) &&
            animationProgress.value === 1 && !isPagerInProgress.value
        );

        if (shouldHandle) {
            runOnJS(freezeOtherScreens)(false);
        }
        return shouldHandle;
    };

    return Gesture.Pan().
        onStart((evt) => {
            if (!shouldAllowPanGesture(evt)) {
                return;
            }
            imageOpacity.value = 1;
            childrenOpacity.value = 0;
        }).
        onUpdate((evt) => {
            if (!shouldAllowPanGesture(evt)) {
                return;
            }

            isGestureActive.value = true;
            childTranslateY.value = evt.translationY;

            onSwipeActive(childTranslateY.value);
        }).
        onEnd((evt) => {
            if (!shouldAllowPanGesture(evt) && !isGestureActive.value) {
                return;
            }
            isGestureActive.value = false;
            const enoughVelocity = Math.abs(evt.velocityY) > 30;
            const rightDirection =
                        (evt.translationY > 150 && evt.velocityY > 0) ||
                        (evt.translationY < 150 && evt.velocityY < 0);

            if (enoughVelocity && rightDirection) {
                const elementVisible = isVisibleImage();

                if (elementVisible) {
                    imageOpacity.value = 1;
                    childrenOpacity.value = 0;
                    animationProgress.value = withTiming(
                        0,
                        pagerTimingConfig,
                        () => {
                            'worklet';

                            opacity.value = 1;
                            onAnimationFinished();
                        },
                    );
                } else {
                    const maybeInvert = (v: number) => {
                        const invert = evt.velocityY < 0;
                        return invert ? -v : v;
                    };

                    opacity.value = 1;

                    childTranslateY.value = withSpring(
                        maybeInvert((target.height || targetDimensions.height) * 2),
                        {
                            stiffness: 50,
                            damping: 30,
                            mass: 1,
                            overshootClamping: true,
                            velocity: Math.abs(evt.velocityY) < 1200 ? maybeInvert(1200) : evt.velocityY,
                        },
                        () => {
                            onAnimationFinished();
                        },
                    );
                }
            } else {
                imageOpacity.value = 0;
                childrenOpacity.value = 1;

                childTranslateY.value = withSpring(0, {
                    stiffness: 1000,
                    damping: 500,
                    mass: 2,
                    restDisplacementThreshold: 10,
                    restSpeedThreshold: 10,
                    velocity: evt.velocityY,
                });

                onSwipeFailure();
            }
        });
}
