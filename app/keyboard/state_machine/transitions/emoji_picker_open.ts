// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, getEmojiSearchActiveHeight} from '@keyboard/state_machine/keyboard_utils';
import {
    InputContainerStateType,
    StateMachineEventType,
    type ActionUpdates,
    type StateTransition,
    type StateSnapshot,
    type StateEvent,
} from '@keyboard/state_machine/types';

/**
 * Transitions for non-edge-to-edge devices (Android API < 30).
 * No KEYBOARD_EVENT_* transitions — library is disabled and OS handles keyboard via adjustResize.
 */
export const emojiPickerOpenTransitionsNonEdgeToEdge: StateTransition[] = [
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_FOCUS_EMOJI_SEARCH,
        to: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        action: (snapshot: StateSnapshot): ActionUpdates => {
            'worklet';

            const searchHeight = getEmojiSearchActiveHeight(snapshot.tabBarHeight, snapshot.safeAreaBottom);
            return {
                inputAccessoryHeight: {value: searchHeight, animated: true},
                targetHeight: {value: searchHeight, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.IDLE,
        action: (): ActionUpdates => {
            'worklet';

            return {
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_CLOSE_EMOJI,
        to: InputContainerStateType.IDLE,
        action: (): ActionUpdates => {
            'worklet';

            return {
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
            };
        },
    },
];

export const emojiPickerOpenTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            if (snapshot.isEmojiSearchActive) {
                // Handle keyboard dismissing after USER_BLUR_EMOJI_SEARCH
                // Keyboard is closing, so interpolate from current height down to targetHeight (preSearchHeight)

                if (event.rawHeight !== undefined && event.height !== undefined && event.progress !== undefined) {
                    const currentHeight = snapshot.inputAccessoryHeight;
                    const targetHeight = snapshot.targetHeight;
                    const keyboardProgress = event.progress;

                    // Clamp to targetHeight
                    const pickerHeight = Math.max(targetHeight, currentHeight - ((currentHeight - targetHeight) * (1 - keyboardProgress)));

                    const updates: ActionUpdates = {
                        inputAccessoryHeight: {value: pickerHeight, animated: false},
                        postInputTranslateY: {value: pickerHeight, animated: false},
                    };

                    return updates;
                }

                return undefined;
            }

            if ((event.rawHeight ?? 0) === 0) {
                return undefined;
            }

            const height = event.height ?? snapshot.keyboardEventHeight;
            const updates: ActionUpdates = {
                inputAccessoryHeight: {value: height, animated: false},
                targetHeight: {value: height, animated: false},
            };

            if (event.rawHeight !== undefined) {
                const keyboardUpdates = calculateKeyboardUpdates(snapshot, height, event.rawHeight);
                Object.assign(updates, keyboardUpdates);
            }
            return updates;
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.KEYBOARD_EVENT_START,
        to: InputContainerStateType.IDLE,
        guard: (snapshot, event) => {
            'worklet';

            // Hardware keyboard detection - dismiss emoji picker only if:
            // 1. Keyboard event with very low rawHeight (< 75) AND
            // 2. NOT waiting for software keyboard to appear
            //    (if waiting, this is a spurious iOS event during keyboard opening)
            return event.rawHeight !== undefined &&
                       event.rawHeight < 75 &&
                       !snapshot.isWaitingForKeyboard;
        },
        action: (): ActionUpdates => {
            'worklet';

            // Hardware keyboard mode - dismiss emoji picker and reset heights
            return {
                inputAccessoryHeight: {value: 0, animated: false},
                targetHeight: {value: 0, animated: false},
                postInputTranslateY: {value: 0, animated: true},
                isEmojiPickerTransition: {value: false, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.EMOJI_TO_KEYBOARD,
        guard: (snapshot: StateSnapshot): boolean => {
            'worklet';

            return !snapshot.hasZeroKeyboardHeight || snapshot.lastKeyboardHeight > 0;
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.IDLE,
        guard: (snapshot: StateSnapshot): boolean => {
            'worklet';

            return snapshot.hasZeroKeyboardHeight;
        },
        action: (): ActionUpdates => {
            'worklet';

            // Hardware keyboard mode - dismiss emoji picker and reset heights
            return {
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: true},
                postInputTranslateY: {value: 0, animated: true},
                scrollOffset: {value: 0, animated: true},
                isEmojiPickerTransition: {value: true, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_CLOSE_EMOJI,
        to: InputContainerStateType.IDLE,
        action: (): ActionUpdates => {
            'worklet';

            return {
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
                postInputTranslateY: {value: 0, animated: true},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.USER_FOCUS_EMOJI_SEARCH,
        to: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
    },
    {
        from: InputContainerStateType.EMOJI_PICKER_OPEN,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        action: (snapshot: StateSnapshot): ActionUpdates | void => {
            'worklet';

            const updates: ActionUpdates = {
                preSearchHeight: {value: 0, animated: false},
                isEmojiSearchActive: {value: false, animated: false},
                isWaitingForKeyboard: {value: false, animated: false},
            };

            // Only snap heights when emoji search was active (keyboard was dismissing after
            // search blur). Ensures interpolation from MOVE events lands precisely at targetHeight.
            // When isEmojiSearchActive is false (e.g. picker just opened and is animating up),
            // skip the snap to avoid cancelling the in-progress withTiming opening animation.
            if (snapshot.isEmojiSearchActive) {
                const targetHeight = snapshot.targetHeight;
                updates.inputAccessoryHeight = {value: targetHeight, animated: false};
                updates.postInputTranslateY = {value: targetHeight, animated: false};
            }

            return updates;
        },
    },
];
