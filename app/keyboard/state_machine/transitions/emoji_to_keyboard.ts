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

export const emojiToKeyboardTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.EMOJI_TO_KEYBOARD,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.EMOJI_TO_KEYBOARD,
        guard: (snapshot: StateSnapshot): boolean => {
            'worklet';

            return snapshot.isEmojiPickerTransition && !snapshot.isDraggingKeyboard && !snapshot.isEmojiSearchActive;
        },
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates | void => {
            'worklet';

            const delta = snapshot.targetHeight - snapshot.keyboardEventHeight;
            if (delta > 0 && event.progress !== undefined) {
                const effectiveHeight = Math.round(snapshot.targetHeight - (delta * event.progress));
                return {
                    inputAccessoryHeight: {value: effectiveHeight, animated: false},
                    postInputTranslateY: {value: effectiveHeight, animated: false},
                };
            }
            return undefined;
        },
    },
    {
        from: InputContainerStateType.EMOJI_TO_KEYBOARD,
        event: StateMachineEventType.KEYBOARD_EVENT_MOVE,
        to: InputContainerStateType.EMOJI_TO_KEYBOARD,
        guard: (snapshot: StateSnapshot): boolean => {
            'worklet';

            return !snapshot.isEmojiSearchActive;
        },
        action: (snapshot: StateSnapshot, event: StateEvent): ActionUpdates => {
            'worklet';

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
        from: InputContainerStateType.EMOJI_TO_KEYBOARD,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.KEYBOARD_OPEN,
        guard: isSoftwareKeyboard,
        action: (): ActionUpdates => {
            'worklet';

            return {
                isDraggingKeyboard: {value: false, animated: false},
                isEmojiSearchActive: {value: false, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_TO_KEYBOARD,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.IDLE,
        guard: isZeroHeight,
        action: (): ActionUpdates => {
            'worklet';

            // Hardware keyboard mode - animate the dismissal
            // This happens when keyboard was expected to open but dismissed to zero height
            return {
                isDraggingKeyboard: {value: false, animated: false},
                isEmojiSearchActive: {value: false, animated: false},
                postInputTranslateY: {value: 0, animated: true},
            };
        },
    },
    {
        from: InputContainerStateType.EMOJI_TO_KEYBOARD,
        event: StateMachineEventType.USER_OPEN_EMOJI,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
    },
];
