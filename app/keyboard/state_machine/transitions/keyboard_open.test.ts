// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {keyboardOpenTransitions} from './keyboard_open';

jest.mock('@keyboard/state_machine/keyboard_utils', () => ({
    calculateKeyboardUpdates: jest.fn((_snapshot, height) => ({
        postInputTranslateY: {value: height, animated: false},
    })),
    isSoftwareKeyboard: jest.fn(() => true),
    isZeroHeight: jest.fn(() => false),
    getEmojiSearchActiveHeight: jest.fn(() => 150),
    calculateSearchHeight: jest.fn((kbH) => kbH + 150),
}));

function makeSnapshot(overrides = {}): StateSnapshot {
    return {
        currentState: InputContainerStateType.KEYBOARD_OPEN,
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
    return {type: StateMachineEventType.KEYBOARD_EVENT_MOVE, ...overrides};
}

describe('keyboardOpenTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isZeroHeight as jest.Mock).mockReturnValue(false);
    });

    describe('[0] KEYBOARD_OPEN → USER_OPEN_EMOJI → KEYBOARD_TO_EMOJI', () => {
        const t = keyboardOpenTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_OPEN_EMOJI);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_TO_EMOJI);
        });

        it('action returns isEmojiPickerTransition=true', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({isEmojiPickerTransition: {value: true, animated: false}});
        });
    });

    describe('[1] KEYBOARD_OPEN → KEYBOARD_EVENT_END → IDLE (isZeroHeight guard)', () => {
        const t = keyboardOpenTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPEN);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('uses isZeroHeight as guard', () => {
            expect(t.guard).toBe(isZeroHeight);
        });

        it('action returns isDraggingKeyboard=false', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({isDraggingKeyboard: {value: false, animated: false}});
        });
    });

    describe('[2] KEYBOARD_OPEN → KEYBOARD_EVENT_MOVE → KEYBOARD_OPEN', () => {
        const t = keyboardOpenTransitions[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPEN);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPEN);
        });

        it('action calls calculateKeyboardUpdates with event.height when rawHeight is defined', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 280, rawHeight: 330});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 280, 330);
        });

        it('action falls back to snapshot.keyboardEventHeight when event.height is undefined', () => {
            const snapshot = makeSnapshot({keyboardEventHeight: 300});
            const event = makeEvent({height: undefined, rawHeight: 330});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 330);
        });

        it('action returns undefined when rawHeight is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 280, rawHeight: undefined}));
            expect(result).toBeUndefined();
        });
    });

    describe('[3] KEYBOARD_OPEN → KEYBOARD_EVENT_END → KEYBOARD_OPEN (isRotating guard)', () => {
        const t = keyboardOpenTransitions[3];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.KEYBOARD_OPEN);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPEN);
        });

        it('guard returns true when isRotating is true', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({isRotating: true}))).toBe(true);
        });

        it('guard returns false when isRotating is false', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({isRotating: false}))).toBe(false);
        });

        it('guard returns false when isRotating is undefined', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({isRotating: undefined}))).toBe(false);
        });

        it('action calls calculateKeyboardUpdates and sets lastKeyboardHeight when rawHeight is defined', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 300, rawHeight: 350, isRotating: true});
            const result = t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 350);
            expect(result).toMatchObject({
                lastKeyboardHeight: {value: 300, animated: false},
            });
        });

        it('action falls back to snapshot.keyboardEventHeight for lastKeyboardHeight when event.height is undefined', () => {
            const snapshot = makeSnapshot({keyboardEventHeight: 300});
            const event = makeEvent({height: undefined, rawHeight: 350, isRotating: true});
            const result = t.action!(snapshot, event) as Record<string, unknown>;

            // height = event.height ?? snapshot.keyboardEventHeight = 300
            expect(result).toMatchObject({
                lastKeyboardHeight: {value: 300, animated: false},
            });
        });

        it('action returns undefined when rawHeight is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 300, rawHeight: undefined, isRotating: true}));
            expect(result).toBeUndefined();
        });
    });
});
