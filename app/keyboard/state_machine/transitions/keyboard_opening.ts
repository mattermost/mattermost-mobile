// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, isSoftwareKeyboard, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {
    InputContainerStateType,
    StateMachineEventType,
    type ActionUpdates,
    type StateTransition,
    type StateSnapshot,
    type StateEvent,
} from '@keyboard/state_machine/types';

export const keyboardOpeningTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.KEYBOARD_OPENING,
        event: StateMachineEventType.USER_OPEN_EMOJI,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
    },
    {
        from: InputContainerStateType.KEYBOARD_OPENING,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.KEYBOARD_OPENING,
        guard: (_snapshot: StateSnapshot, event: StateEvent): boolean => {
            'worklet';

            return (event.height ?? 0) > 0;
        },
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            if (event.height !== undefined && event.rawHeight !== undefined) {
                return calculateKeyboardUpdates(snapshot, event.height, event.rawHeight);
            }
            return undefined;
        },
    },
    {
        from: InputContainerStateType.KEYBOARD_OPENING,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.KEYBOARD_OPEN,
        guard: isSoftwareKeyboard,
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates => {
            'worklet';

            const updates: ActionUpdates = {
                isDraggingKeyboard: {value: false, animated: false},
            };

            if (event.height !== undefined && event.rawHeight !== undefined && event.height > 0) {
                const keyboardUpdates = calculateKeyboardUpdates(snapshot, event.height, event.rawHeight);
                Object.assign(updates, keyboardUpdates);
            }

            return updates;
        },
    },
    {
        from: InputContainerStateType.KEYBOARD_OPENING,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.IDLE,
        guard: isZeroHeight,
        action: (snapshot: StateSnapshot): ActionUpdates => {
            'worklet';

            // Correct scrollPosition by removing the postInputTranslateY that was applied
            // during the aborted keyboard open (spurious onInteractive during hw keyboard connect).
            // Reset scrollOffset to 0 so the reconciler scrolls the list to the correct position.
            const adjustedScrollPosition = snapshot.scrollPosition - snapshot.postInputTranslateY;

            return {
                isDraggingKeyboard: {value: false, animated: false},
                postInputTranslateY: {value: 0, animated: false},
                targetHeight: {value: 0, animated: false},
                scrollOffset: {value: 0, animated: false},
                scrollPosition: {value: adjustedScrollPosition, animated: false},
            };
        },
    },
];
