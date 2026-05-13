// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {
    InputContainerStateType,
    StateMachineEventType,
    type ActionUpdates,
    type StateTransition,
} from '@keyboard/state_machine/types';

export const keyboardToEmojiTransitions: StateTransition[] = [
    {
        from: InputContainerStateType.KEYBOARD_TO_EMOJI,
        event: StateMachineEventType.KEYBOARD_EVENT_END,
        to: InputContainerStateType.EMOJI_PICKER_OPEN,
        guard: isZeroHeight,
        action: (): ActionUpdates => {
            'worklet';

            return {
                isDraggingKeyboard: {value: false, animated: false},
            };
        },
    },
    {
        from: InputContainerStateType.KEYBOARD_TO_EMOJI,
        event: StateMachineEventType.USER_FOCUS_INPUT,
        to: InputContainerStateType.KEYBOARD_OPEN,
    },
];
