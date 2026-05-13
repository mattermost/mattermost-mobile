// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, isSoftwareKeyboard, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {keyboardOpeningTransitions} from './keyboard_opening';

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
        currentState: InputContainerStateType.KEYBOARD_OPENING,
        lastKeyboardHeight: 0,
        keyboardEventHeight: 0,
        inputAccessoryHeight: 0,
        postInputTranslateY: 100,
        targetHeight: 0,
        preSearchHeight: 0,
        tabBarHeight: 49,
        safeAreaBottom: 0,
        scrollPosition: 200,
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
    return {type: StateMachineEventType.KEYBOARD_EVENT_MOVE, ...overrides};
}

describe('keyboardOpeningTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isSoftwareKeyboard as jest.Mock).mockReturnValue(true);
        (isZeroHeight as jest.Mock).mockReturnValue(false);
    });

    describe('[0] KEYBOARD_OPENING → USER_OPEN_EMOJI → EMOJI_PICKER_OPEN', () => {
        const t = keyboardOpeningTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPENING);
            expect(t.event).toBe(StateMachineEventType.USER_OPEN_EMOJI);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('should have no guard', () => {
            expect(t.guard).toBeUndefined();
        });

        it('should have no action', () => {
            expect(t.action).toBeUndefined();
        });
    });

    describe('[1] KEYBOARD_OPENING → KEYBOARD_EVENT_MOVE → KEYBOARD_OPENING', () => {
        const t = keyboardOpeningTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPENING);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPENING);
        });

        it('guard returns true when height > 0', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: 300}))).toBe(true);
        });

        it('guard returns false when height is 0', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: 0}))).toBe(false);
        });

        it('guard returns false when height is undefined', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: undefined}))).toBe(false);
        });

        it('action calls calculateKeyboardUpdates when height and rawHeight are defined', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 300, rawHeight: 350});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 350);
        });

        it('action returns undefined when height is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: undefined, rawHeight: 350}));
            expect(result).toBeUndefined();
        });

        it('action returns undefined when rawHeight is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 300, rawHeight: undefined}));
            expect(result).toBeUndefined();
        });
    });

    describe('[2] KEYBOARD_OPENING → KEYBOARD_EVENT_END → KEYBOARD_OPEN (isSoftwareKeyboard guard)', () => {
        const t = keyboardOpeningTransitions[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPENING);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPEN);
        });

        it('uses isSoftwareKeyboard as guard', () => {
            expect(t.guard).toBe(isSoftwareKeyboard);
        });

        it('action always includes isDraggingKeyboard=false', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 0}));
            expect(result).toMatchObject({isDraggingKeyboard: {value: false, animated: false}});
        });

        it('action calls calculateKeyboardUpdates when height and rawHeight are defined and height > 0', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 300, rawHeight: 350});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 350);
        });

        it('action does not call calculateKeyboardUpdates when height is 0', () => {
            t.action!(makeSnapshot(), makeEvent({height: 0, rawHeight: 0}));
            expect(calculateKeyboardUpdates).not.toHaveBeenCalled();
        });

        it('action does not call calculateKeyboardUpdates when height is undefined', () => {
            t.action!(makeSnapshot(), makeEvent({height: undefined, rawHeight: 350}));
            expect(calculateKeyboardUpdates).not.toHaveBeenCalled();
        });
    });

    describe('[3] KEYBOARD_OPENING → KEYBOARD_EVENT_END → IDLE (isZeroHeight guard)', () => {
        const t = keyboardOpeningTransitions[3];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPENING);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('uses isZeroHeight as guard', () => {
            expect(t.guard).toBe(isZeroHeight);
        });

        it('action returns isDraggingKeyboard=false, postInputTranslateY=0, targetHeight=0, scrollOffset=0', () => {
            const snapshot = makeSnapshot({scrollPosition: 200, postInputTranslateY: 100});
            const result = t.action!(snapshot, makeEvent());
            expect(result).toMatchObject({
                isDraggingKeyboard: {value: false, animated: false},
                postInputTranslateY: {value: 0, animated: false},
                targetHeight: {value: 0, animated: false},
                scrollOffset: {value: 0, animated: false},
            });
        });

        it('action sets scrollPosition to scrollPosition - postInputTranslateY', () => {
            const snapshot = makeSnapshot({scrollPosition: 200, postInputTranslateY: 100});
            const result = t.action!(snapshot, makeEvent()) as Record<string, unknown>;
            expect(result.scrollPosition).toEqual({value: 100, animated: false});
        });
    });
});
