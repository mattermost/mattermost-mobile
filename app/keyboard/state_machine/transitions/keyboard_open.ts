// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_INPUT_ACCESSORY_HEIGHT} from '@keyboard/constants';
import {calculateKeyboardUpdates, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {
    InputContainerStateType,
    StateMachineEventType,
    type ActionUpdates,
    type StateTransition,
    type StateSnapshot,
    type StateEvent,
} from '@keyboard/state_machine/types';

export const keyboardOpenTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.KEYBOARD_OPEN,
        event: StateMachineEventType.USER_OPEN_EMOJI,
        to: InputContainerStateType.KEYBOARD_TO_EMOJI,
        action: (): ActionUpdates => {
            'worklet';

            // Set transition flag to prevent hasZeroKeyboardHeight from being updated
            // when KEYBOARD_EVENT_END fires during keyboard dismissal
            return {
                isEmojiPickerTransition: {value: true, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.KEYBOARD_OPEN,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.IDLE,
        guard: isZeroHeight,
        action: (): ActionUpdates => {
            'worklet';

            return {
                isDraggingKeyboard: {value: false, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.KEYBOARD_OPEN,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.KEYBOARD_OPEN,
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            const height = event.height ?? snapshot.keyboardEventHeight;

            if (event.rawHeight !== undefined) {
                return calculateKeyboardUpdates(snapshot, height, event.rawHeight);
            }

            return undefined;
        },
    },
    {
        from: InputContainerStateType.KEYBOARD_OPEN,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.KEYBOARD_OPEN,
        guard: (_: StateSnapshot, event: StateEvent): boolean => {
            'worklet';

            return event.isRotating === true;
        },
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';
            const height = event.height ?? snapshot.keyboardEventHeight;

            if (event.rawHeight !== undefined) {
                const base = calculateKeyboardUpdates(snapshot, height, event.rawHeight);
                return {
                    ...base,
                    lastKeyboardHeight: {value: height ?? DEFAULT_INPUT_ACCESSORY_HEIGHT, animated: false},
                };
            }

            return undefined;
        },
    },
];
