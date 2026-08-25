// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, isSoftwareKeyboard} from '@keyboard/state_machine/keyboard_utils';
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
 * The OS handles keyboard avoidance via adjustResize — no KEYBOARD_EVENT_* fire.
 * Only emoji picker user events are handled.
 */
export const idleTransitionsNonEdgeToEdge: StateTransition[] = [
    {
        from: InputContainerStateType.IDLE,
        event: StateMachineEventType.USER_OPEN_EMOJI,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        action: (): ActionUpdates => {
            'worklet';

            return {
                isWaitingForKeyboard: {value: true, animated: false},
            };
        },
    },
];

export const idleTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.IDLE,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.KEYBOARD_OPENING,
        guard: (snapshot: StateSnapshot): boolean => {
            'worklet';

            return !snapshot.hasZeroKeyboardHeight;
        },
        action: (): ActionUpdates => {
            'worklet';

            // Set flag indicating we're waiting for keyboard to appear
            // This helps block spurious KEYBOARD_EVENT_START events that fire when
            // emoji picker opens quickly after focusing input
            return {
                isWaitingForKeyboard: {value: true, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.IDLE,
        event: StateMachineEventType.KEYBOARD_EVENT_START,
        to: InputContainerStateType.KEYBOARD_OPENING,
        guard: (_snapshot, event) => {
            'worklet';

            return (event.height ?? 0) >= 75;
        },
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            if (event.height !== undefined && event.rawHeight !== undefined && event.height > 0) {
                return calculateKeyboardUpdates(snapshot, event.height, event.rawHeight);
            }
            return undefined;
        },
    },
    {
        from: InputContainerStateType.IDLE,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.KEYBOARD_OPENING,
        guard: (_snapshot, event) => {
            'worklet';

            return (event.height ?? 0) >= 75;
        },
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            if (event.height !== undefined && event.rawHeight !== undefined && event.height > 0) {
                return calculateKeyboardUpdates(snapshot, event.height, event.rawHeight);
            }
            return undefined;
        },
    },
    {

        // Handle hardware keyboard disconnect: software keyboard reappears firing only onEnd
        // (no onStart/onMove sequence). Jump directly to KEYBOARD_OPEN with the final height.
        from: InputContainerStateType.IDLE,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.KEYBOARD_OPEN,
        guard: isSoftwareKeyboard,
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates => {
            'worklet';

            const height = event.height ?? 0;
            const rawHeight = event.rawHeight ?? height;
            const updates: ActionUpdates = {
                isDraggingKeyboard: {value: false, animated: false},
            };
            if (height > 0) {
                const keyboardUpdates = calculateKeyboardUpdates(snapshot, height, rawHeight);
                Object.assign(updates, keyboardUpdates);
                updates.lastKeyboardHeight = {value: height, animated: false};
                updates.targetHeight = {value: height, animated: false};
            }
            return updates;
        },
    },
    {
        from: InputContainerStateType.IDLE,
        event: StateMachineEventType.USER_OPEN_EMOJI,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        action: (): ActionUpdates => {
            'worklet';

            // Set flag indicating we're waiting for keyboard to appear
            // This helps block spurious KEYBOARD_EVENT_START events that fire when
            // emoji picker opens (iOS fires these events even when just mounting emoji picker)
            return {
                isWaitingForKeyboard: {value: true, animated: false},
            };
        },
    },
];
