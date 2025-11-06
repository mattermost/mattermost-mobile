// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useKeyboardHandler} from 'react-native-keyboard-controller';
import {useAnimatedScrollHandler, useSharedValue} from 'react-native-reanimated';

export const useKeyboardAnimation = () => {
    /**
   * progress: Keyboard animation progress (0 = closed, 1 = fully open)
   * Used for: Tracking keyboard animation state
   */
    const progress = useSharedValue(0);

    /**
   * height: Current visual height used for animating the input container
   * This is the value that actually moves the input up/down
   * Smoothed during interactive gestures to prevent jerky movements
   */
    const height = useSharedValue(0);

    /**
   * inset: Bottom inset for the scroll view
   * Adds padding at the bottom of scroll content so it doesn't hide behind keyboard
   */
    const inset = useSharedValue(0);

    /**
   * offset: Scroll offset adjustment when keyboard opens
   * Ensures the scroll view scrolls to the right position when keyboard appears
   */
    const offset = useSharedValue(0);

    /**
   * scroll: Tracks the current scroll position of the ScrollView
   * Used to calculate proper offset when keyboard opens
   */
    const scroll = useSharedValue(0);

    /**
   * keyboardHeight: The exact height of the keyboard from events
   * Always reflects the true keyboard height without smoothing
   */
    const keyboardHeight = useSharedValue(0);

    /**
   * isKeyboardOpening: Tracks if keyboard is currently opening (vs closing)
   * Used for: Smooth height updates - only increase when opening, only decrease when closing
   */
    const isKeyboardOpening = useSharedValue(false);

    const isKeyboardFullyOpen = useSharedValue(false);

    // ------------------------------------------------------------------
    // KEYBOARD EVENT HANDLERS
    // ------------------------------------------------------------------

    /**
   * useKeyboardHandler: Subscribe to keyboard lifecycle events
   *
   * IMPORTANT: All callbacks here are WORKLETS (run on UI thread)
   * The "worklet" directive tells Reanimated to compile this function for the UI thread
   * This enables 60fps smooth animations without JavaScript thread delays
   *
   * Event lifecycle:
   * 1. onStart: Keyboard animation begins
   * 2. onInteractive: User is dragging keyboard interactively
   * 3. onMove: Keyboard position changes during animation
   * 4. onEnd: Keyboard animation completes
   */
    useKeyboardHandler({

        /**
     * onStart: Called when keyboard animation starts
     * @param e - Event object with keyboard information
     */
        onStart: (e) => {
            'worklet'; // Mark this function to run on UI thread (60fps)

            // Update progress (0-1 range)
            progress.value = e.progress;

            // Store the exact keyboard height
            keyboardHeight.value = e.height;

            // Determine if keyboard is opening or closing
            // Opening if new height is greater than current visual height
            isKeyboardOpening.value = e.height > height.value;

            // Update scroll view insets and offsets
            // inset: Adds bottom padding to scroll content
            inset.value = e.height;
        },

        /**
     * onInteractive: Called continuously while user drags keyboard interactively
     * This provides smooth real-time updates as the user swipes
     *
     * @param e - Event object with keyboard information
     */
        onInteractive: (e) => {
            'worklet';

            isKeyboardFullyOpen.value = false;
            progress.value = e.progress;
            if (progress.value === 1) {
                height.value = Math.max(e.height, keyboardHeight.value);
                return;
            }

            // SMOOTH HEIGHT UPDATE LOGIC:
            // Problem: If we directly set height.value = e.height, the input can jump
            // Solution: Only allow height to increase when opening, decrease when closing
            // This prevents sudden jumps when direction changes mid-gesture
            if (isKeyboardOpening.value) {
                // Opening: Only allow height to grow (prevents downward jumps)
                if (e.height >= height.value) {
                    height.value = Math.max(e.height, keyboardHeight.value);
                }
            } else {
                height.value = Math.min(e.height, keyboardHeight.value);
            }

        },

        /**
     * onMove: Called continuously as keyboard animates (programmatic or gesture)
     * Similar to onInteractive but for all keyboard movements
     *
     * @param e - Event object with keyboard information
     */
        onMove: (e) => {
            'worklet';

            if (isKeyboardFullyOpen.value) {
                return;
            }

            progress.value = e.progress;
            offset.value = e.height;

            if (progress.value === 1) {
                isKeyboardFullyOpen.value = true;
                height.value = Math.max(e.height, keyboardHeight.value);
                offset.value = height.value;
                return;
            }

            // Same smooth update logic as onInteractive
            if (isKeyboardOpening.value) {
                if (e.height >= height.value) {
                    height.value = e.height;
                }
            } else {
                height.value = e.height;
            }

        },

        /**
        * onEnd: Called when keyboard animation completes
        * This is where we set final values to ensure everything is in correct state
        * If keyboard is fully closed, reset offset
        *
        * @param e - Event object with keyboard information
        */
        onEnd: (e) => {
            'worklet';

            if (e.progress === 1) {
                height.value = keyboardHeight.value;
                inset.value = keyboardHeight.value;
                isKeyboardFullyOpen.value = true;
            } else {
                height.value = e.height;
                inset.value = e.height;
                isKeyboardFullyOpen.value = false;
            }
            progress.value = e.progress;
            keyboardHeight.value = e.height;

            // Reset state flags
            isKeyboardOpening.value = false;

        },
    });

    // ------------------------------------------------------------------
    // SCROLL HANDLER
    // ------------------------------------------------------------------

    /**
   * Handle scroll events on the UI thread for smooth performance
   * Tracks scroll position to calculate proper keyboard offset
   */
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            // Only track scroll when not in custom view mode
            // console.log('On scroll', e.contentOffset.y, inset.value);
            scroll.value = e.contentOffset.y;

            // console.log('On scroll', e.contentOffset.y, inset.value, scroll.value);
        },
    });

    return {height, progress, onScroll, inset, offset, keyboardHeight, scroll};
};
