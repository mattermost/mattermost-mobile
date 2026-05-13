// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {calculateSearchHeight, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
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
 * No KEYBOARD_EVENT_* transitions — library is disabled, keyboard managed by OS via adjustResize.
 * No isZeroHeight guard on USER_BLUR_EMOJI_SEARCH since hasZeroKeyboardHeight is never set.
 */
export const emojiSearchActiveTransitionsNonEdgeToEdge: StateTransition[] = [
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.USER_BLUR_EMOJI_SEARCH,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        action: (snapshot: StateSnapshot): ActionUpdates => {
            'worklet';

            const normalHeight = snapshot.preSearchHeight;
            return {
                inputAccessoryHeight: {value: normalHeight, animated: true},
                targetHeight: {value: normalHeight, animated: false},
                preSearchHeight: {value: 0, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.USER_CLOSE_EMOJI,
        to: InputContainerStateType.IDLE,
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
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
];

export const emojiSearchActiveTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.KEYBOARD_EVENT_START,
        to: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            // Capture the actual keyboard height when it starts opening
            // This allows us to recalculate the search height with the real keyboard value
            if (event.rawHeight !== undefined && event.height !== undefined) {
                // Use adjusted keyboard height for proper positioning from origin
                const searchHeight = calculateSearchHeight(
                    event.height,
                    snapshot.tabBarHeight,
                    snapshot.safeAreaBottom,
                );

                return {
                    targetHeight: {value: searchHeight, animated: false},
                    lastKeyboardHeight: {value: event.height, animated: false},
                    keyboardEventHeight: {value: event.rawHeight, animated: false},
                };
            }
            return undefined;
        },
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            // Capture the actual keyboard height when it starts opening
            // This allows us to recalculate the search height with the real keyboard value
            if (event.rawHeight !== undefined && event.height !== undefined) {

                const preSearchHeight = snapshot.preSearchHeight;
                const targetHeight = snapshot.targetHeight;
                const keyboardProgress = event.progress ?? 0;

                // Interpolate from preSearchHeight to targetHeight based on keyboard progress
                const clampedProgress = Math.min(1, keyboardProgress);
                const searchHeight = preSearchHeight + ((targetHeight - preSearchHeight) * clampedProgress);

                return {
                    inputAccessoryHeight: {value: searchHeight, animated: false},
                    postInputTranslateY: {value: searchHeight, animated: false},
                };
            }
            return undefined;
        },
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        action: (snapshot: StateSnapshot): ActionUpdates | void => {
            'worklet';

            const targetHeight = snapshot.targetHeight - snapshot.tabBarHeight;
            const updates: ActionUpdates = {
                isEmojiSearchActive: {value: true, animated: false},
                inputAccessoryHeight: {value: targetHeight, animated: snapshot.hasZeroKeyboardHeight},
                postInputTranslateY: {value: targetHeight, animated: snapshot.hasZeroKeyboardHeight},
            };

            if (Platform.OS === 'ios') {
                updates.scrollOffset = {value: targetHeight, animated: snapshot.hasZeroKeyboardHeight};
            }

            return updates;
        },
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.USER_BLUR_EMOJI_SEARCH,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        guard: isZeroHeight,
        action: (snapshot: StateSnapshot): ActionUpdates => {
            'worklet';

            // If keyboard is already dismissed, just snap back to pre-search height
            const normalHeight = snapshot.preSearchHeight;

            const updates: ActionUpdates = {
                inputAccessoryHeight: {value: normalHeight, animated: true},
                postInputTranslateY: {value: normalHeight, animated: true},
            };

            if (Platform.OS === 'ios') {
                updates.scrollOffset = {value: normalHeight, animated: true};
            }

            return updates;
        },
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.USER_CLOSE_EMOJI,
        to: InputContainerStateType.IDLE,
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.EMOJI_TO_KEYBOARD,
        guard: (snapshot: StateSnapshot, event: StateEvent): boolean => {
            'worklet';

            // If the event itself carries a real keyboard height, the software keyboard is
            // already open — take this path regardless of the potentially-stale hasZeroKeyboardHeight.
            // hasZeroKeyboardHeight may still be true from the previous keyboard dismiss cycle
            // because the KEYBOARD_EVENT_START that resets it is queued after this USER_FOCUS_INPUT.
            if (event.height !== undefined && event.height > 75) {
                return true;
            }

            return !snapshot.hasZeroKeyboardHeight;
        },
        action: (snapshot: StateSnapshot): ActionUpdates => {
            'worklet';

            // Immediately shrink emoji picker from expanded search height to normal height
            // Use animation to make it smooth since keyboard events may not provide smooth interpolation
            const normalHeight = snapshot.preSearchHeight;

            return {
                inputAccessoryHeight: {value: normalHeight, animated: true},
                postInputTranslateY: {value: normalHeight, animated: true},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.IDLE,
        guard: (snapshot: StateSnapshot, event: StateEvent): boolean => {
            'worklet';

            // Only go to IDLE if neither the event height nor hasZeroKeyboardHeight
            // indicates a software keyboard is present.
            if (event.height !== undefined && event.height > 75) {
                return false;
            }

            return snapshot.hasZeroKeyboardHeight;
        },
        action: (): ActionUpdates => {
            'worklet';

            return {
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: true},
                postInputTranslateY: {value: 0, animated: true},
            };
        },
    },
];
