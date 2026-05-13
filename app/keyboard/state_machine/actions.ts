// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Platform} from 'react-native';
import {scheduleOnRN} from 'react-native-worklets';

import {isEdgeToEdge} from '@constants/device';
import Events from '@constants/events';
import {
    DEFAULT_INPUT_ACCESSORY_HEIGHT,
    KEYBOARD_TRANSITION_DURATION,
} from '@keyboard/constants';
import {calculateSearchHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, type ActionUpdates, type InputContainerState, type StateEvent, type StateSnapshot} from '@keyboard/state_machine/types';

/**
 * Helper to emit device events from worklet context
 * Must be defined at module level (not inline) for scheduleOnRN to work
 */
const emitDeviceEvent = (eventName: string, value: boolean) => {
    DeviceEventEmitter.emit(eventName, value);
};

/**
 * Entry action: IDLE → EMOJI_PICKER_OPEN or KEYBOARD_TO_EMOJI → EMOJI_PICKER_OPEN
 * Mount emoji picker and set target height
 */
export function enterEmojiPickerOpen(snapshot: StateSnapshot, _event?: StateEvent, fromState?: string): ActionUpdates {
    'worklet';

    let emojiPickerHeight = snapshot.lastKeyboardHeight || DEFAULT_INPUT_ACCESSORY_HEIGHT;

    if (fromState === InputContainerStateType.IDLE) {
        // Coming from IDLE - animate emoji picker opening
        const updates: ActionUpdates = {
            targetHeight: {value: emojiPickerHeight, animated: false},
            inputAccessoryHeight: {value: emojiPickerHeight, animated: true},
        };

        if (isEdgeToEdge) {
            updates.postInputTranslateY = {value: emojiPickerHeight, animated: true};

            if (Platform.OS === 'ios') {
                updates.scrollOffset = {value: emojiPickerHeight, animated: true};
            }
        }

        return updates;
    }

    if (fromState === InputContainerStateType.EMOJI_SEARCH_ACTIVE) {
        // Coming from EMOJI_SEARCH_ACTIVE after USER_BLUR_EMOJI_SEARCH
        // Set targetHeight to preSearchHeight - keyboard will dismiss and MOVE events will interpolate down
        const targetPickerHeight = snapshot.preSearchHeight;

        return {
            targetHeight: {value: targetPickerHeight, animated: false},
        };
    }

    // Coming from another state (e.g., KEYBOARD_TO_EMOJI)
    // Determine emoji picker height based on available information
    if (snapshot.lastKeyboardHeight > 0) {
        emojiPickerHeight = snapshot.lastKeyboardHeight;
    } else if (snapshot.postInputTranslateY > 0) {
        emojiPickerHeight = snapshot.postInputTranslateY;
    } else if (snapshot.inputAccessoryHeight > 0) {
        emojiPickerHeight = snapshot.inputAccessoryHeight;
    }

    // Set all values immediately (no animation for transition from keyboard)
    const updates: ActionUpdates = {
        targetHeight: {value: emojiPickerHeight, animated: false},
        inputAccessoryHeight: {value: emojiPickerHeight, animated: false},
        postInputTranslateY: {value: emojiPickerHeight, animated: false},
    };

    if (Platform.OS === 'ios') {
        updates.scrollOffset = {value: emojiPickerHeight, animated: false};
    }

    return updates;
}

/**
 * Entry action: * → IDLE
 * Reset state and un-pause reconciler
 */
export function enterIdle(): ActionUpdates {
    'worklet';

    return {
        isReconcilerPaused: {value: false, animated: false},
        isWaitingForKeyboard: {value: false, animated: false},
        isEmojiPickerTransition: {value: false, animated: false},
        isEmojiSearchActive: {value: false, animated: false},
        isDraggingKeyboard: {value: false, animated: false},
    };
}

/**
 * Entry action: KEYBOARD_OPENING → KEYBOARD_OPEN
 * Finalize keyboard position
 */
export function enterKeyboardOpen(snapshot: StateSnapshot, event?: StateEvent): ActionUpdates {
    'worklet';

    // Clear guard flag when entering KEYBOARD_OPEN state
    const wasGuarded = snapshot.isEmojiPickerTransition;

    // When coming from EMOJI_TO_KEYBOARD, always use keyboardEventHeight (captured from onStart)
    // The event height might be the adjusted height from KeyboardGestureArea
    const height = wasGuarded ? snapshot.keyboardEventHeight : (event?.height ?? snapshot.keyboardEventHeight);

    const MIN_KEYBOARD_HEIGHT = 75;

    const updates: ActionUpdates = {
        isEmojiPickerTransition: {value: false, animated: false},
    };

    if (height > MIN_KEYBOARD_HEIGHT) {
        if (!snapshot.isDraggingKeyboard) {
            updates.lastKeyboardHeight = {value: height, animated: false};
        }
        updates.targetHeight = {value: height, animated: false};

        // When coming from EMOJI_TO_KEYBOARD (wasGuarded), we need to update postInputTranslateY
        // if it wasn't set correctly (lastKeyboardHeight was 0 when exiting emoji picker)
        // Animate if transitioning from emoji search (preserves animation from transition action)
        if (wasGuarded) {
            updates.postInputTranslateY = {value: height, animated: snapshot.isEmojiSearchActive};

            if (Platform.OS === 'ios') {
                updates.scrollOffset = {value: height, animated: false};
            }
        }
    } else if (height > 0 && !wasGuarded) {
        // Fractional height during dismissal - don't update lastKeyboardHeight
        // Only process if not guarded (normal keyboard open transition)
        updates.targetHeight = {value: height, animated: false};
    }

    return updates;
}

/**
 * Entry action: EMOJI_PICKER_OPEN → EMOJI_SEARCH_ACTIVE
 * Expand picker to accommodate search bar and keyboard
 */
export function enterEmojiSearchActive(snapshot: StateSnapshot): ActionUpdates {
    'worklet';

    const preSearchHeight = snapshot.inputAccessoryHeight;
    const keyboardHeight = snapshot.lastKeyboardHeight > 0 ? snapshot.lastKeyboardHeight : snapshot.keyboardEventHeight;
    const searchHeight = calculateSearchHeight(keyboardHeight, snapshot.tabBarHeight, snapshot.safeAreaBottom);

    scheduleOnRN(emitDeviceEvent, Events.EMOJI_PICKER_SEARCH_FOCUSED, true);

    return {
        preSearchHeight: {value: preSearchHeight, animated: false},
        targetHeight: {value: searchHeight, animated: false},
        isEmojiSearchActive: {value: true, animated: false},
    };
}

/**
 * Exit action: EMOJI_SEARCH_ACTIVE → EMOJI_PICKER_OPEN
 * Restore picker to pre-search height
 */
export function exitEmojiSearchToPickerOpen(snapshot: StateSnapshot): ActionUpdates {
    'worklet';

    // Emit event for other components
    scheduleOnRN(emitDeviceEvent, Events.EMOJI_PICKER_SEARCH_FOCUSED, false);

    // Restore to pre-search height (with animation)
    // Set isWaitingForKeyboard to block spurious iOS KEYBOARD_EVENT_START(rawHeight=0) that
    // fires after blur of emoji search input - same as USER_OPEN_EMOJI sets it
    return {
        targetHeight: {value: snapshot.preSearchHeight, animated: true, duration: KEYBOARD_TRANSITION_DURATION},
        preSearchHeight: {value: 0, animated: false},
        isWaitingForKeyboard: {value: true, animated: false},
    };
}

/**
 * Exit action: EMOJI_SEARCH_ACTIVE → EMOJI_TO_KEYBOARD (Software Keyboard)
 * Keep input in place, show keyboard
 */
export function exitEmojiSearchToKeyboard(snapshot: StateSnapshot): ActionUpdates {
    'worklet';

    // Emit event for other components
    scheduleOnRN(emitDeviceEvent, Events.EMOJI_PICKER_SEARCH_FOCUSED, false);

    // Clear pre-search height tracking
    return {
        preSearchHeight: {value: 0, animated: false},
        targetHeight: {value: snapshot.preSearchHeight, animated: false},
    };
}

/**
 * Exit action: EMOJI_SEARCH_ACTIVE → IDLE (Hardware Keyboard)
 * Translate input down (no keyboard to show)
 */
export function exitEmojiSearchToIdle(): ActionUpdates {
    'worklet';

    // Emit event for other components
    scheduleOnRN(emitDeviceEvent, Events.EMOJI_PICKER_SEARCH_FOCUSED, false);

    // Pause reconciler so it doesn't fire scroll compensation while inputAccessoryHeight
    // and postInputTranslateY animate to 0 (transition action handles the animation).
    return {
        isReconcilerPaused: {value: true, animated: false},
        preSearchHeight: {value: 0, animated: false},
    };
}

/**
 * Exit action: EMOJI_PICKER_OPEN → EMOJI_TO_KEYBOARD
 * Set guard flag to block keyboard event handlers during emoji→keyboard transition
 * This prevents keyboard events from interfering with the transition
 */
export function exitEmojiPickerToKeyboard(): ActionUpdates | void {
    'worklet';

    // Set guard flag to block keyboard event animations during transition
    // This prevents keyboard handlers from overwriting transition values
    // The flag will be cleared when entering KEYBOARD_OPEN state
    return {
        isEmojiPickerTransition: {value: true, animated: false},
    };
}

/**
 * Exit action: EMOJI_PICKER_OPEN → IDLE
 * Unmount picker and reset height
 */
export function exitEmojiPickerToIdle(snapshot: StateSnapshot): ActionUpdates {
    'worklet';

    // Check if we're dismissing via interactive drag gesture
    // If so, skip animations since gesture already animated the values
    const isDragging = snapshot.isDraggingKeyboard;

    const baseUpdates: ActionUpdates = {
        isReconcilerPaused: {value: true, animated: false},
        isDraggingKeyboard: {value: false, animated: false},
        isEmojiPickerTransition: {value: false, animated: false},
    };

    // Only set if we had a real keyboard height - prevents setting scrollOffset and targetHeight to 0 when dismissing from hardware keyboard with no emoji picker height
    if (!snapshot.hasZeroKeyboardHeight) {
        baseUpdates.targetHeight = {value: 0, animated: false};
        baseUpdates.postInputTranslateY = {value: 0, animated: false};
    }

    if (isDragging) {
        // Swipe gesture already animated values to 0 - just set final values
        // Don't adjust scrollPosition - gesture handler already managed it
        return {
            ...baseUpdates,
            inputAccessoryHeight: {value: 0, animated: false},
        };
    }

    return {
        ...baseUpdates,
        inputAccessoryHeight: {value: 0, animated: true},
    };
}

/**
 * Exit action: KEYBOARD_OPEN → IDLE
 * Reset container position and scroll padding when keyboard dismisses
 */
export function exitKeyboardOpenToIdle(snapshot: StateSnapshot): ActionUpdates {
    'worklet';

    const updates: ActionUpdates = {
        isReconcilerPaused: {value: true, animated: false},
        postInputTranslateY: {value: 0, animated: false},
        targetHeight: {value: 0, animated: false},
    };

    // Correct scrollPosition when keyboard dismisses.
    // scrollPosition = contentOffset.y + postInputTranslateY, so after dismissal the correct
    // value is: contentOffset.y = scrollPosition - <height currently baked in>.
    //
    // Two cases:
    // 1. Interactive drag (isDraggingKeyboard=true): onScroll is blocked during drag so
    //    scrollPosition is frozen with full keyboard height baked in, while postInputTranslateY
    //    has been animated down to ~0 by MOVE events. Use lastKeyboardHeight.
    //
    // 2. Non-interactive (isDraggingKeyboard=false, e.g. hardware keyboard connect): an
    //    onStart between the spurious onInteractive and onEnd resets isDraggingKeyboard=false.
    //    postInputTranslateY reflects the actual height currently applied (may be partially
    //    reduced by spurious MOVEs). Use postInputTranslateY as the exact baked-in contribution.
    if (Platform.OS === 'ios') {
        const heightToSubtract = snapshot.isDraggingKeyboard ? snapshot.lastKeyboardHeight : snapshot.postInputTranslateY;
        const adjustedScrollPosition = snapshot.scrollPosition - heightToSubtract;
        updates.scrollPosition = {value: adjustedScrollPosition, animated: false};
    }

    return updates;
}

/**
 * Get the state entry action for a given state
 * @param state - The state to enter
 * @returns The entry action function, or undefined if none
 */
export function getStateEntryAction(state: string): ((snapshot: StateSnapshot, event?: StateEvent, fromState?: InputContainerState) => ActionUpdates | void) | undefined {
    'worklet';

    switch (state) {
        case InputContainerStateType.IDLE:
            return enterIdle;
        case InputContainerStateType.KEYBOARD_OPEN:
            return enterKeyboardOpen;
        case InputContainerStateType.EMOJI_PICKER_OPEN:
        case InputContainerStateType.KEYBOARD_TO_EMOJI:
            return enterEmojiPickerOpen;
        case InputContainerStateType.EMOJI_SEARCH_ACTIVE:
            return enterEmojiSearchActive;
        default:
            return undefined;
    }
}

/**
 * Get the state exit action for a given state transition
 * @param fromState - The state being exited
 * @param toState - The state being entered
 * @returns The exit action function, or undefined if none
 */
export function getStateExitAction(fromState: string, toState: string): ((snapshot: StateSnapshot, event?: StateEvent) => ActionUpdates | void) | undefined {
    'worklet';

    // Exit actions are specific to the transition, not just the from state
    if (fromState === InputContainerStateType.EMOJI_SEARCH_ACTIVE) {
        if (toState === InputContainerStateType.EMOJI_PICKER_OPEN) {
            return exitEmojiSearchToPickerOpen;
        } else if (toState === InputContainerStateType.EMOJI_TO_KEYBOARD) {
            return exitEmojiSearchToKeyboard;
        } else if (toState === InputContainerStateType.IDLE) {
            return exitEmojiSearchToIdle;
        }
    }

    if (fromState === InputContainerStateType.EMOJI_TO_KEYBOARD) {
        if (toState === InputContainerStateType.IDLE) {
            return exitEmojiPickerToIdle;
        }
    }

    if (fromState === InputContainerStateType.EMOJI_PICKER_OPEN) {
        if (toState === InputContainerStateType.IDLE) {
            return exitEmojiPickerToIdle;
        } else if (toState === InputContainerStateType.EMOJI_TO_KEYBOARD) {
            return exitEmojiPickerToKeyboard;
        }
    }

    if (fromState === InputContainerStateType.KEYBOARD_OPEN) {
        if (toState === InputContainerStateType.IDLE) {
            return exitKeyboardOpenToIdle;
        }
    }

    return undefined;
}
