// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {Platform} from 'react-native';
import {Gesture} from 'react-native-gesture-handler';
import {useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {scheduleOnRN} from 'react-native-worklets';

import {useKeyboardState} from '@context/keyboard_state';
import {useIsTablet, useWindowDimensions} from '@hooks/device';

/**
 * Hook that returns a Gesture.Pan() for interactive emoji picker dismiss.
 * Runs entirely on the UI thread — zero JS bridge per frame.
 * iOS only — Android handles this differently.
 * Designed to be used with Gesture.Simultaneous(Gesture.Native(), panGesture)
 * wrapping the post list FlatList, so the gesture can activate while the list
 * is still scrolling (the native scroll gesture and this pan run simultaneously).
 *
 * Activation logic mirrors interactive keyboard dismiss:
 * - Touch starts in list area, finger moves down into post input boundary → activate
 */
export function useInputAccessoryViewGesture() {
    const {height: windowHeight} = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const {stateContext, isEmojiSearchFocused, setIsEmojiSearchFocused, stateMachine} = useKeyboardState();

    const effectiveWindowHeight = isTablet ? windowHeight : windowHeight - insets.bottom;

    const originalEmojiPickerHeight = useSharedValue(0);
    const lastDragHeight = useSharedValue(0);
    const dragVelocityY = useSharedValue(0);
    const isDragActive = useSharedValue(false);
    const previousTouchY = useSharedValue(-1);

    const dismissEmojiPicker = useCallback(() => {
        setIsEmojiSearchFocused(false);
        stateMachine.onUserCloseEmoji();
    }, [setIsEmojiSearchFocused, stateMachine]);

    const panGesture = Gesture.Pan().
        manualActivation(true).
        onTouchesMove((e, manager) => {
            'worklet';

            // Skip if emoji picker is not open or search is active
            if (!stateContext.inputAccessoryHeight.value || isEmojiSearchFocused) {
                return;
            }

            const touch = e.changedTouches[0];
            if (!touch) {
                return;
            }

            const fingerY = touch.absoluteY;
            const containerHeight = stateContext.postInputContainerHeight.value;
            const pickerHeight = stateContext.inputAccessoryHeight.value;
            const interactiveTopEdge = effectiveWindowHeight - containerHeight - pickerHeight;
            const interactiveBottomEdge = effectiveWindowHeight - containerHeight;

            const isMovingDown = previousTouchY.value >= 0 && fingerY > previousTouchY.value;
            previousTouchY.value = fingerY;

            // Activate when the finger is within the post input / picker area and moving downward
            // This mirrors the old onTouchMove: we don't care where the touch started
            if (fingerY >= interactiveTopEdge && fingerY <= interactiveBottomEdge && isMovingDown) {
                if (!isDragActive.value) {
                    originalEmojiPickerHeight.value = pickerHeight;
                    stateContext.isDraggingKeyboard.value = true;
                    isDragActive.value = true;
                    lastDragHeight.value = pickerHeight;
                }
                manager.activate();
            }
        }).
        onTouchesUp((_, manager) => {
            'worklet';
            previousTouchY.value = -1;
            if (!isDragActive.value) {
                manager.fail();
            }
        }).
        onUpdate((e) => {
            'worklet';

            if (!isDragActive.value) {
                return;
            }

            dragVelocityY.value = e.velocityY;

            const containerHeight = stateContext.postInputContainerHeight.value;
            const distanceFromBottom = effectiveWindowHeight - e.absoluteY;
            const pickerHeight = distanceFromBottom - containerHeight;
            const maxHeight = originalEmojiPickerHeight.value;

            let clamped = pickerHeight < 0 ? 0 : pickerHeight;
            if (clamped > maxHeight) {
                clamped = maxHeight;
            }

            lastDragHeight.value = clamped;
            stateContext.inputAccessoryHeight.value = clamped;
            stateContext.postInputTranslateY.value = clamped;
        }).
        onEnd(() => {
            'worklet';

            if (!isDragActive.value) {
                return;
            }
            isDragActive.value = false;

            const swipingDown = dragVelocityY.value > 0;
            const currentHeight = lastDragHeight.value;

            if (swipingDown) {
                stateContext.inputAccessoryHeight.value = withTiming(0, {duration: 250}, () => {
                    stateContext.scrollOffset.value = 0;
                    scheduleOnRN(dismissEmojiPicker);
                });
                stateContext.postInputTranslateY.value = withTiming(0, {duration: 250});
            } else {
                const targetHeight = originalEmojiPickerHeight.value;

                stateContext.inputAccessoryHeight.value = withTiming(targetHeight, {duration: 250}, () => {
                    stateContext.isDraggingKeyboard.value = false;
                    stateContext.scrollOffset.value = 0;
                });
                stateContext.postInputTranslateY.value = withTiming(targetHeight, {duration: 250});

                // Restore scroll position to compensate for partial drag
                const correctedScroll = (stateContext.scrollPosition.value - currentHeight) + targetHeight;
                stateContext.scrollPosition.value = correctedScroll;
            }
        }).
        onFinalize(() => {
            'worklet';
            isDragActive.value = false;
        });

    // Only use on iOS — Android handles emoji picker dismiss differently
    return {panGesture: Platform.OS === 'ios' ? panGesture : undefined};
}
