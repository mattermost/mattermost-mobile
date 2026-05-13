// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {scheduleOnUI} from 'react-native-worklets';

import {StateMachineEventType, type StateEvent} from '@keyboard';

import type {KeyboardStateContextReturn} from '@hooks/use_keyboard_state_context';

type UseKeyboardStateMachineReturn = {

    // Event dispatchers
    onUserFocusInput: (asHardwareKeyboard?: boolean) => void;
    onUserOpenEmoji: () => void;
    onUserCloseEmoji: () => void;
    onUserFocusEmojiSearch: (asHardwareKeyboard?: boolean) => void;
    onUserBlurEmojiSearch: () => void;

    // State queries
    isEmojiPickerActive: () => boolean;
};

/**
 * Core hook that wraps state machine
 * Accepts context from useKeyboardStateContext
 * Exposes functions to dispatch user events
 * Returns current state and helper functions
 */
export function useKeyboardStateMachine(context: KeyboardStateContextReturn): UseKeyboardStateMachineReturn {
    // Destructure to avoid passing context object into closures
    const {processEvent, isEmojiPickerActive} = context;

    const processWithOptionalHardwareKeyboard = (event: StateEvent, asHardwareKeyboard = false) => {
        'worklet';

        processEvent(event);

        if (asHardwareKeyboard) {
            processEvent({
                type: StateMachineEventType.KEYBOARD_EVENT_START,
                rawHeight: 0,
                height: 0,
                progress: 0,
            });

            processEvent({
                type: StateMachineEventType.KEYBOARD_EVENT_END,
                rawHeight: 0,
                height: 0,
                progress: 0,
            });
        }
    };

    // User event dispatchers
    // CRITICAL: These are called from JS thread, so must use scheduleOnUI to execute processEvent on UI thread
    // NOTE: scheduleOnUI schedules async, so keyboard events may arrive first and be blocked
    // This is acceptable - the user event will eventually process and subsequent keyboard events work
    const onUserFocusInput = (asHardwareKeyboard = false) => {
        const value = asHardwareKeyboard ? 0 : undefined;

        scheduleOnUI(processWithOptionalHardwareKeyboard, {
            type: StateMachineEventType.USER_FOCUS_INPUT,
            rawHeight: value,
            height: value, // for backward compatibility with events from onStart which only have rawHeight
            progress: value, // assume fully open if height provided, otherwise 0
        }, asHardwareKeyboard);
    };

    const onUserOpenEmoji = () => {
        scheduleOnUI(processEvent, {
            type: StateMachineEventType.USER_OPEN_EMOJI,
        });
    };

    const onUserCloseEmoji = () => {
        scheduleOnUI(processEvent, {
            type: StateMachineEventType.USER_CLOSE_EMOJI,
        });
    };

    const onUserFocusEmojiSearch = (asHardwareKeyboard = false) => {
        scheduleOnUI(processWithOptionalHardwareKeyboard, {type: StateMachineEventType.USER_FOCUS_EMOJI_SEARCH}, asHardwareKeyboard);
    };

    const onUserBlurEmojiSearch = () => {
        scheduleOnUI(processEvent, {
            type: StateMachineEventType.USER_BLUR_EMOJI_SEARCH,
        });
    };

    return {
        onUserFocusInput,
        onUserOpenEmoji,
        onUserCloseEmoji,
        onUserFocusEmojiSearch,
        onUserBlurEmojiSearch,
        isEmojiPickerActive,
    };
}
