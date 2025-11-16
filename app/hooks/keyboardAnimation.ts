// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useKeyboardHandler} from 'react-native-keyboard-controller';
import {useAnimatedScrollHandler, useSharedValue} from 'react-native-reanimated';

export const useKeyboardAnimation = (postInputContainerHeight: number, enableAnimation = true) => {
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

    /**
     * isKeyboardClosing: Tracks if keyboard is currently closing (detected in onInteractive)
     * Used to prevent height jumps in onMove when user releases finger mid-swipe
     */
    const isKeyboardClosing = useSharedValue(false);

    /**
     * isKeyboardFullyOpen: True when keyboard is fully open (height > 0 and progress === 1)
     */
    const isKeyboardFullyOpen = useSharedValue(false);

    /**
     * isKeyboardFullyClosed: True when keyboard is fully closed (height === 0)
     */
    const isKeyboardFullyClosed = useSharedValue(true);

    /**
     * isKeyboardInTransition: True when keyboard is animating between open/closed states
     */
    const isKeyboardInTransition = useSharedValue(false);

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

            // On Android, use native keyboard behavior (no custom animations)
            if (!enableAnimation) {
                return;
            }

            // Ignore adjustment event from KeyboardGestureArea (fires after keyboard fully opens)
            // After keyboard reaches full height, KeyboardGestureArea sends offset-adjusted event
            // We use both offset prop AND manual animation, so this would cause flicker
            // Example: keyboard opens at 346px → then adjustment event at 229px (346 - 117 offset)
            if (parseInt(e.height.toString()) === keyboardHeight.value - postInputContainerHeight) {
                return;
            }

            progress.value = e.progress;

            // Store the exact keyboard height
            keyboardHeight.value = e.height;
            height.value = e.height;

            // Determine if keyboard is opening or closing
            // Opening if new height is greater than current visual height
            isKeyboardOpening.value = e.height > height.value;

            // Update keyboard state flags
            isKeyboardFullyClosed.value = e.height === 0;
            isKeyboardFullyOpen.value = e.height > 0 && e.progress === 1;
            isKeyboardInTransition.value = e.height > 0 && e.progress < 1;

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

            // On Android, use native keyboard behavior (no custom animations)
            if (!enableAnimation) {
                return;
            }

            if (parseInt(e.height.toString()) === postInputContainerHeight) {
                return;
            }

            // Track if keyboard is closing (height decreasing)
            isKeyboardClosing.value = e.height < height.value;

            height.value = e.height;
            offset.value = e.height;
            inset.value = e.height;

            // Update keyboard state flags
            isKeyboardFullyClosed.value = e.height === 0;
            isKeyboardFullyOpen.value = e.height > 0 && e.progress === 1;
            isKeyboardInTransition.value = e.height > 0 && e.progress < 1;
        },

        /**
         * onMove: Called continuously as keyboard animates (programmatic or gesture)
         * Similar to onInteractive but for all keyboard movements
         *
         * @param e - Event object with keyboard information
         */
        onMove: (e) => {
            'worklet';

            // On Android, use native keyboard behavior (no custom animations)
            if (!enableAnimation) {
                return;
            }

            // If keyboard is closing (detected in onInteractive), set height/offset/inset to 0
            // This prevents the keyboard from jumping back up when user releases finger mid-swipe
            if (isKeyboardClosing.value) {
                height.value = 0;
                offset.value = 0;
                inset.value = 0;
                return;
            }

            // Ignore adjustment event from KeyboardGestureArea (fires after keyboard fully opens)
            // After keyboard reaches full height, KeyboardGestureArea sends offset-adjusted event
            // We use both offset prop AND manual animation, so this would cause flicker
            // Example: keyboard opens at 346px → then adjustment event at 229px (346 - 117 offset)
            if (parseInt(e.height.toString()) === keyboardHeight.value - postInputContainerHeight) {
                return;
            }

            const absHeight = Math.abs(e.height); // Use Math.abs because programmatic dismiss (KeyboardController.dismiss()) reports negative heights

            height.value = absHeight;
            offset.value = absHeight;
            inset.value = absHeight;

            // Update keyboard state flags
            isKeyboardFullyClosed.value = absHeight === 0;
            isKeyboardFullyOpen.value = absHeight > 0 && e.progress === 1;
            isKeyboardInTransition.value = absHeight > 0 && e.progress < 1;

        },

        onEnd: (e) => {
            'worklet';

            // On Android, use native keyboard behavior (no custom animations)
            if (!enableAnimation) {
                return;
            }

            // Reset closing flag when animation ends
            isKeyboardClosing.value = false;

            if (progress.value === 1) {
                height.value = Math.max(e.height, keyboardHeight.value);
                isKeyboardFullyOpen.value = true;
                isKeyboardFullyClosed.value = false;
                isKeyboardInTransition.value = false;
            }

            if (progress.value === 0) {
                height.value = Math.min(e.height, 0);
                isKeyboardFullyOpen.value = false;
                isKeyboardFullyClosed.value = true;
                isKeyboardInTransition.value = false;
            }
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
            scroll.value = e.contentOffset.y + inset.value;
        },
    });

    return {
        height,
        onScroll,
        inset,
        offset,
        keyboardHeight,
        scroll,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
    };
};
