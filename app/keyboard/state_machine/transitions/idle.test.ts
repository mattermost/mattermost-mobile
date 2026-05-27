// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, isSoftwareKeyboard} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {idleTransitions, idleTransitionsNonEdgeToEdge} from './idle';

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
        currentState: InputContainerStateType.IDLE,
        lastKeyboardHeight: 0,
        keyboardEventHeight: 0,
        inputAccessoryHeight: 0,
        postInputTranslateY: 0,
        targetHeight: 0,
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
    return {type: StateMachineEventType.USER_OPEN_EMOJI, ...overrides};
}

describe('idleTransitionsNonEdgeToEdge', () => {
    it('should have correct from/event/to for [0]', () => {
        const t = idleTransitionsNonEdgeToEdge[0];
        expect(t.from).toBe(InputContainerStateType.IDLE);
        expect(t.event).toBe(StateMachineEventType.USER_OPEN_EMOJI);
        expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
    });

    it('should return isWaitingForKeyboard=true from action', () => {
        const t = idleTransitionsNonEdgeToEdge[0];
        const result = t.action!(makeSnapshot(), makeEvent());
        expect(result).toEqual({isWaitingForKeyboard: {value: true, animated: false}});
    });
});

describe('idleTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isSoftwareKeyboard as jest.Mock).mockReturnValue(true);
    });

    describe('[0] IDLE → USER_FOCUS_INPUT → KEYBOARD_OPENING', () => {
        const t = idleTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.IDLE);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPENING);
        });

        it('guard returns true when hasZeroKeyboardHeight is false', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: false}), makeEvent())).toBe(true);
        });

        it('guard returns false when hasZeroKeyboardHeight is true', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: true}), makeEvent())).toBe(false);
        });

        it('action returns isWaitingForKeyboard=true', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({isWaitingForKeyboard: {value: true, animated: false}});
        });
    });

    describe('[1] IDLE → KEYBOARD_EVENT_START → KEYBOARD_OPENING', () => {
        const t = idleTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.IDLE);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_START);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPENING);
        });

        it('guard returns true when height >= 75', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: 300}))).toBe(true);
        });

        it('guard returns false when height < 75', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: 30}))).toBe(false);
        });

        it('guard returns false when height is undefined', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: undefined}))).toBe(false);
        });

        it('action calls calculateKeyboardUpdates when height and rawHeight are defined and height > 0', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 300, rawHeight: 350});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 350);
        });

        it('action returns undefined when height is 0', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 0, rawHeight: 0}));
            expect(result).toBeUndefined();
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

    describe('[2] IDLE → KEYBOARD_EVENT_MOVE → KEYBOARD_OPENING', () => {
        const t = idleTransitions[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.IDLE);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPENING);
        });

        it('guard returns true when height >= 75', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: 300}))).toBe(true);
        });

        it('guard returns false when height < 75', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({height: 30}))).toBe(false);
        });

        it('action calls calculateKeyboardUpdates when height and rawHeight are defined and height > 0', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 300, rawHeight: 350});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 350);
        });

        it('action returns undefined when height is 0', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 0, rawHeight: 0}));
            expect(result).toBeUndefined();
        });

        it('action returns undefined when rawHeight is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 300, rawHeight: undefined}));
            expect(result).toBeUndefined();
        });
    });

    describe('[3] IDLE → KEYBOARD_EVENT_END → KEYBOARD_OPEN (isSoftwareKeyboard guard)', () => {
        const t = idleTransitions[3];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.IDLE);
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

        it('action calls calculateKeyboardUpdates and sets lastKeyboardHeight and targetHeight when height > 0', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 300, rawHeight: 350});
            const result = t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 300, 350);
            expect(result).toMatchObject({
                isDraggingKeyboard: {value: false, animated: false},
                lastKeyboardHeight: {value: 300, animated: false},
                targetHeight: {value: 300, animated: false},
            });
        });

        it('action only returns isDraggingKeyboard when height is 0', () => {
            const result = t.action!(makeSnapshot(), makeEvent({height: 0, rawHeight: 0}));
            expect(result).toEqual({isDraggingKeyboard: {value: false, animated: false}});
            expect(calculateKeyboardUpdates).not.toHaveBeenCalled();
        });
    });

    describe('[4] IDLE → USER_OPEN_EMOJI → EMOJI_PICKER_OPEN', () => {
        const t = idleTransitions[4];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.IDLE);
            expect(t.event).toBe(StateMachineEventType.USER_OPEN_EMOJI);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('action returns isWaitingForKeyboard=true', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({isWaitingForKeyboard: {value: true, animated: false}});
        });
    });
});
