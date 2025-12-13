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
   * keyboardTranslateY: Keyboard height (adjusted for tab bar) used to animate input container position
   *
   * How it works: This value represents the keyboard height and is used with negative translateY
   * in useKeyboardAwarePostDraft.ts (transform: [{translateY: -keyboardTranslateY.value}]) to move the input
   * container UP by the keyboard height amount. Higher keyboard height = input moves up more.
   *
   * Smoothed during interactive gestures to prevent jerky movements
   */
    const keyboardTranslateY = useSharedValue(0);

    /**
   * bottomInset: Bottom inset for the scroll view
   * Adds padding at the bottom of scroll content so it doesn't hide behind keyboard
   */
    const bottomInset = useSharedValue(0);

    /**
   * scrollOffset: Scroll offset adjustment when keyboard opens
   * Ensures the scroll view scrolls to the right position when keyboard appears
   */
    const scrollOffset = useSharedValue(0);

    /**
   * scroll: Tracks the current scroll position of the ScrollView
   * Used to calculate proper offset when keyboard opens
   */
    const scrollPosition = useSharedValue(0);

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
     * isInteractiveGesture: Tracks if we're in an interactive gesture (user touching keyboard)
     * Used to: Distinguish between normal keyboard opening vs stale events after gesture
     */
    const isInteractiveGesture = useSharedValue(false);

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
    const tabBarAdjustment = isTablet && !isThreadView ? BOTTOM_TAB_HEIGHT + safeAreaBottom : safeAreaBottom;

    /**
   * isInputAccessoryViewMode: Whether we're showing input accessory view (emoji picker) instead of keyboard
   * When true, keyboard handlers are ignored to prevent interference with the emoji picker
   */
    const isInputAccessoryViewMode = useSharedValue(false);

    /**
   * isTransitioningFromCustomView: Special mode when transitioning from custom view to keyboard
   * Prevents height updates during the transition to avoid jumps
   */
    const isTransitioningFromCustomView = useSharedValue(false);

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
            'worklet';

            // Ignore keyboard events when showing custom view (emoji picker)
            if (isInputAccessoryViewMode.value) {
                return;
            }

            // Ignore keyboard events during transition from custom view to keyboard
            if (isTransitioningFromCustomView.value) {
                return;
            }

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

            // CRITICAL FIX: On real iOS devices, onStart can fire with progress: 1 before animation completes
            // Even if progress is 1, we should NOT set isKeyboardFullyOpen to true in onStart because:
            // 1. onMove events may still come with lower progress values
            // 2. Only onEnd with progress === 1 should mark the keyboard as fully open
            // This prevents jerky behavior where the input container jumps down and back up
            const wasAlreadyOpen = keyboardTranslateY.value > 0;

            // Always treat as transitioning if we might receive more events (even with progress: 1)
            // Only exception: if height is 0 (keyboard closing)
            const shouldTreatAsTransitioning = e.height > 0 && (e.progress < 1 || wasAlreadyOpen);

            keyboardTranslateY.value = adjustedHeight;

            // Update keyboard state flags
            // NEVER mark as fully open in onStart - always wait for onEnd to confirm
            isKeyboardFullyClosed.value = e.height === 0;
            isKeyboardFullyOpen.value = false; // Always false in onStart - onEnd will set it correctly
            isKeyboardInTransition.value = e.height > 0 && shouldTreatAsTransitioning;

            // Update scroll view insets and offsets
            // bottomInset: Adds bottom padding to scroll content
            bottomInset.value = adjustedHeight;

            // scrollOffset: Ensures the scroll view scrolls with the keyboard animation
            scrollOffset.value = adjustedHeight;
        },

        /**
         * onInteractive: Called continuously while user drags keyboard interactively
         * This provides smooth real-time updates as the user swipes
         *
         * @param e - Event object with keyboard information
         */
        onInteractive: (e) => {
            'worklet';

            // Ignore keyboard events when showing custom view (emoji picker)
            if (isInputAccessoryViewMode.value) {
                return;
            }

            // Ignore keyboard events during transition from custom view to keyboard
            if (isTransitioningFromCustomView.value) {
                return;
            }

            // On Android, use native keyboard behavior (no custom animations)
            if (!isEnabled.value || !enableAnimation) {
                return;
            }

            if (parseInt(e.height.toString()) === postInputContainerHeight) {
                return;
            }

            // Ignore stale interactive events during screen navigation
            // When navigating from channel (keyboard open) to thread, the channel's keyboard dismissal
            // can trigger stale onInteractive events that arrive at the newly mounted thread screen.
            // If keyboard is fully closed (keyboardTranslateY === 0), any onInteractive event is stale and should be ignored.
            if (keyboardTranslateY.value === 0) {
                return;
            }

            if (keyboardTranslateY.value > 0) {
                isInteractiveGesture.value = true;
            }

            // Track if keyboard is closing (keyboardTranslateY decreasing) or opening (keyboardTranslateY increasing)
            // This detects direction changes mid-gesture for smooth animations
            if (e.height < keyboardTranslateY.value) {
                isKeyboardClosing.value = true;
            } else if (e.height > keyboardTranslateY.value) {
                // User changed direction - swiped back up
                isKeyboardClosing.value = false;
            }

            const adjustedHeight = e.height - (tabBarAdjustment * e.progress);
            keyboardTranslateY.value = adjustedHeight;
            scrollOffset.value = adjustedHeight;
            bottomInset.value = adjustedHeight;

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

            // Ignore keyboard events when showing custom view (emoji picker)
            if (isInputAccessoryViewMode.value) {
                return;
            }

            // During transition from custom view, don't update keyboardHeight from onMove events
            // These events can be stale/out-of-order. Wait for onEnd to get the final correct height.
            if (isTransitioningFromCustomView.value) {
                return;
            }

            // On Android, use native keyboard behavior (no custom animations)
            if (!isEnabled.value || !enableAnimation) {
                return;
            }

            // If keyboard is closing (detected in onInteractive), set keyboardTranslateY/scrollOffset/bottomInset to 0
            // This prevents the keyboard from jumping back up when user releases finger mid-swipe
            if (isKeyboardClosing.value) {
                keyboardTranslateY.value = 0;
                scrollOffset.value = 0;
                bottomInset.value = 0;
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

            // CRITICAL FIX: On real iOS devices, onStart can fire with progress: 1 before animation completes
            // Then onMove events come with lower heights/progress, causing jerky behavior
            // If we've already reached the final keyboard height (isKeyboardFullyOpen or keyboardHeight matches final),
            // ignore onMove events that would reduce keyboardTranslateY below the final value
            // BUT: Always allow scrollOffset and bottomInset to update during animation for smooth scrolling
            const finalHeight = keyboardHeight.value;
            const finalAdjustedHeight = finalHeight > 0 ? finalHeight - tabBarAdjustment : 0;
            const hasReachedFinalState = finalHeight > 0 && keyboardTranslateY.value >= finalAdjustedHeight * 0.95; // 95% threshold to account for rounding

            if (hasReachedFinalState && absHeight < keyboardTranslateY.value && e.progress < 1) {
                // Still update scrollOffset and bottomInset even if we ignore keyboardTranslateY
                // This ensures the list scrolls smoothly with the keyboard animation
                scrollOffset.value = absHeight;
                bottomInset.value = absHeight;
                return;
            }

            // Ignore stale/incorrect events ONLY during/after interactive gestures
            // After user releases finger mid-swipe up, onMove sometimes gets wrong height values
            // Example: keyboard at 346px, user releases, onMove reports 80px (stale from earlier)
            // This check only applies during interactive gestures, not during normal keyboard opening
            if (isInteractiveGesture.value && absHeight < keyboardTranslateY.value && e.progress < 1) {
                return;
            }

            keyboardTranslateY.value = absHeight;
            scrollOffset.value = absHeight;
            bottomInset.value = absHeight;

            // Update keyboard state flags
            isKeyboardFullyClosed.value = absHeight === 0;
            isKeyboardFullyOpen.value = absHeight > 0 && e.progress === 1;
            isKeyboardInTransition.value = absHeight > 0 && e.progress < 1;
        },

        onEnd: (e) => {
            'worklet';

            // Skip processing if screen is not enabled/visible or if animations are disabled
            if (!isEnabled.value) {
                return;
            }

            // Ignore keyboard events when showing custom view (emoji picker)
            if (isInputAccessoryViewMode.value) {
                isKeyboardClosing.value = false;
                isTransitioningFromCustomView.value = false;
                return;
            }

            // On Android, use native keyboard behavior (no custom animations)
            if (!enableAnimation) {
                isKeyboardClosing.value = false;
                isTransitioningFromCustomView.value = false;
                return;
            }

            // Ignore adjustment event from KeyboardGestureArea (can fire in onEnd too)
            // After keyboard reaches full height, KeyboardGestureArea sends offset-adjusted event
            // Example: keyboard opens at 346px → then adjustment event at 255px (346 - 91 offset)
            if (parseInt(e.height.toString()) === keyboardHeight.value - postInputContainerHeight) {
                return;
            }

            // Store if we were transitioning from custom view before clearing the flag
            const wasTransitioningFromCustomView = isTransitioningFromCustomView.value;

            // Reset state flags
            isKeyboardClosing.value = false;
            isTransitioningFromCustomView.value = false;
            isInteractiveGesture.value = false;

            // Use e.progress (from event) not progress.value (shared value might be stale)
            if (e.progress === 1) {
                // CRITICAL FIX: Update keyboardHeight FIRST from onEnd event (most reliable source)
                // During transition, onMove events can be stale/out-of-order, so onEnd's height is authoritative
                // Store previous value for stale check before updating
                const previousKeyboardHeight = keyboardHeight.value;
                keyboardHeight.value = e.height;

                // Use same calculation as onInteractive/onMove for consistency
                const adjustedHeight = e.height - (tabBarAdjustment * e.progress);

                // Ignore stale/out-of-order events
                // If keyboard is supposed to be closed (previousKeyboardHeight = 0) but we get an open event,
                // it's a stale event from before the close - ignore it
                if (previousKeyboardHeight === 0 && e.height > 0) {
                    return;
                }

                // If transitioning from custom view, always update keyboardTranslateY to match keyboard
                // This ensures correct positioning when emoji picker height != keyboard height
                if (wasTransitioningFromCustomView) {
                    keyboardTranslateY.value = adjustedHeight;
                } else if (Math.abs(keyboardTranslateY.value - adjustedHeight) > 1) {
                    // For normal keyboard opening, only adjust if significantly different
                    keyboardTranslateY.value = adjustedHeight;
                }

                // Update bottomInset and scrollOffset to match final keyboard height
                // This ensures messages don't get hidden behind keyboard
                bottomInset.value = adjustedHeight;
                scrollOffset.value = adjustedHeight;

                isKeyboardFullyOpen.value = true;
                isKeyboardFullyClosed.value = false;
                isKeyboardInTransition.value = false;
            }

            // Use e.progress (from event) not progress.value (shared value might be stale)
            if (e.progress === 0) {
                // Only set to 0 if not already close to 0
                if (Math.abs(keyboardTranslateY.value) > 0.5) {
                    keyboardTranslateY.value = 0;
                }
                isKeyboardFullyOpen.value = false;
                isKeyboardFullyClosed.value = true;
                isKeyboardInTransition.value = false;
                scrollOffset.value = 0;
                bottomInset.value = 0;
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
            scrollPosition.value = e.contentOffset.y + bottomInset.value;
        },
    });

    return {
        keyboardTranslateY,
        onScroll,
        bottomInset,
        scrollOffset,
        keyboardHeight,
        scrollPosition,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
        isInputAccessoryViewMode,
        isTransitioningFromCustomView,
    };
};
