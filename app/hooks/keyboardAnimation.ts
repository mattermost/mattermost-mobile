// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useKeyboardHandler} from 'react-native-keyboard-controller';
import {useAnimatedScrollHandler, useDerivedValue, useSharedValue} from 'react-native-reanimated';

import {BOTTOM_TAB_HEIGHT} from '@constants/view';

export const useKeyboardAnimation = (
    postInputContainerHeight: number,
    enableAnimation = true,
    isTablet = false,
    safeAreaBottom = 0,
    isThreadView = false,
    enabled = true,
) => {
    /**
   * progress: Keyboard animation progress (0 = closed, 1 = fully open)
   * Used for: Tracking keyboard animation state
   */
    const progress = useSharedValue(0);

    /**
   * height: Keyboard height (adjusted for tab bar) used to animate input container position
   *
   * How it works: This value represents the keyboard height and is used with negative translateY
   * in useKeyboardAwarePostDraft.ts (transform: [{translateY: -height.value}]) to move the input
   * container UP by the keyboard height amount. Higher keyboard height = input moves up more.
   *
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

    /**
     * isEnabled: Shared value to track if keyboard handling is enabled for this screen
     * Used to prevent processing keyboard events when screen is not visible
     * useDerivedValue automatically tracks the enabled prop and updates reactively
     */
    const isEnabled = useDerivedValue(() => enabled, [enabled]);

    // Calculate tab bar adjustment (only for tablets, not in thread view)
    // This accounts for the tab bar height + safe area bottom that gets hidden when keyboard opens
    // Thread views don't have a tab bar, so no adjustment is needed
    const tabBarAdjustment = isTablet && !isThreadView ? BOTTOM_TAB_HEIGHT + safeAreaBottom : 0;

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

            // Skip processing if screen is not enabled/visible or if animations are disabled
            if (!isEnabled.value || !enableAnimation) {
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
            const adjustedHeight = e.height - (tabBarAdjustment * e.progress);
            height.value = adjustedHeight;

            // Update keyboard state flags
            isKeyboardFullyClosed.value = e.height === 0;
            isKeyboardFullyOpen.value = e.height > 0 && e.progress === 1;
            isKeyboardInTransition.value = e.height > 0 && e.progress < 1;

            // Update scroll view insets and offsets
            // inset: Adds bottom padding to scroll content
            inset.value = adjustedHeight;
        },

        /**
         * onInteractive: Called continuously while user drags keyboard interactively
         * This provides smooth real-time updates as the user swipes
         *
         * @param e - Event object with keyboard information
         */
        onInteractive: (e) => {
            'worklet';

            // Skip processing if screen is not enabled/visible or if animations are disabled
            if (!isEnabled.value || !enableAnimation) {
                return;
            }

            if (parseInt(e.height.toString()) === postInputContainerHeight) {
                return;
            }

            // Track if keyboard is closing (height decreasing)
            isKeyboardClosing.value = e.height < height.value;

            const adjustedHeight = e.height - (tabBarAdjustment * e.progress);
            height.value = adjustedHeight;
            offset.value = adjustedHeight;
            inset.value = adjustedHeight;

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

            // Skip processing if screen is not enabled/visible or if animations are disabled
            if (!isEnabled.value || !enableAnimation) {
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

            const absHeight = Math.abs(e.height) - (tabBarAdjustment * e.progress); // Use Math.abs because programmatic dismiss (KeyboardController.dismiss()) reports negative heights

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

            // Skip processing if screen is not enabled/visible or if animations are disabled
            if (!isEnabled.value || !enableAnimation) {
                return;
            }

            // Reset closing flag when animation ends
            isKeyboardClosing.value = false;

            if (progress.value === 1) {
                const adjustedHeight = Math.max(e.height, keyboardHeight.value) - (tabBarAdjustment * e.progress);
                height.value = adjustedHeight;
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
