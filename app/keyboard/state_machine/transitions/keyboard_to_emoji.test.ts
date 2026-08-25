// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {keyboardToEmojiTransitions} from './keyboard_to_emoji';

jest.mock('@keyboard/state_machine/keyboard_utils', () => ({
    calculateKeyboardUpdates: jest.fn((snapshot, height) => ({
        postInputTranslateY: {value: height, animated: false},
    })),
    isSoftwareKeyboard: jest.fn(() => true),
    isZeroHeight: jest.fn(() => false),
    getEmojiSearchActiveHeight: jest.fn(() => 150),
    calculateSearchHeight: jest.fn((kbH) => kbH + 150),
}));

function makeSnapshot(overrides = {}): StateSnapshot {
    return {
        currentState: InputContainerStateType.KEYBOARD_TO_EMOJI,
        lastKeyboardHeight: 300,
        keyboardEventHeight: 300,
        inputAccessoryHeight: 0,
        postInputTranslateY: 0,
        targetHeight: 300,
        preSearchHeight: 0,
        tabBarHeight: 49,
        safeAreaBottom: 0,
        scrollPosition: 0,
        scrollOffset: 0,
        postInputContainerHeight: 0,
        isEmojiPickerTransition: false,
        isEmojiSearchActive: false,
        isDraggingKeyboard: false,
        isWaitingForKeyboard: false,
        hasZeroKeyboardHeight: false,
        ...overrides,
    };
}

function makeEvent(overrides: Partial<StateEvent> = {}): StateEvent {
    return {type: StateMachineEventType.KEYBOARD_EVENT_END, ...overrides};
}

describe('keyboardToEmojiTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isZeroHeight as jest.Mock).mockReturnValue(false);
    });

    describe('[0] KEYBOARD_TO_EMOJI → KEYBOARD_EVENT_END → EMOJI_PICKER_OPEN (isZeroHeight guard)', () => {
        const t = keyboardToEmojiTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_TO_EMOJI);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('uses isZeroHeight as guard', () => {
            expect(t.guard).toBe(isZeroHeight);
        });

        it('action returns isDraggingKeyboard=false', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({isDraggingKeyboard: {value: false, animated: false}});
        });
    });

    describe('[1] KEYBOARD_TO_EMOJI → USER_FOCUS_INPUT → KEYBOARD_OPEN', () => {
        const t = keyboardToEmojiTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_TO_EMOJI);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPEN);
        });

        it('should have no guard', () => {
            expect(t.guard).toBeUndefined();
        });

        it('should have no action', () => {
            expect(t.action).toBeUndefined();
        });
    });
});
