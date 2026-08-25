// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, isSoftwareKeyboard, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {emojiToKeyboardTransitions} from './emoji_to_keyboard';

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
        currentState: InputContainerStateType.EMOJI_TO_KEYBOARD,
        lastKeyboardHeight: 300,
        keyboardEventHeight: 200,
        inputAccessoryHeight: 300,
        postInputTranslateY: 300,
        targetHeight: 400,
        preSearchHeight: 0,
        tabBarHeight: 49,
        safeAreaBottom: 0,
        scrollPosition: 0,
        scrollOffset: 0,
        postInputContainerHeight: 0,
        isEmojiPickerTransition: true,
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

describe('emojiToKeyboardTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isSoftwareKeyboard as jest.Mock).mockReturnValue(true);
        (isZeroHeight as jest.Mock).mockReturnValue(false);
    });

    describe('[0] EMOJI_TO_KEYBOARD → KEYBOARD_EVENT_MOVE → EMOJI_TO_KEYBOARD (interpolation guard)', () => {
        const t = emojiToKeyboardTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
        });

        it('guard returns true when isEmojiPickerTransition=true and not dragging and not search active', () => {
            const snapshot = makeSnapshot({isEmojiPickerTransition: true, isDraggingKeyboard: false, isEmojiSearchActive: false});
            expect(t.guard!(snapshot, makeEvent())).toBe(true);
        });

        it('guard returns false when isEmojiPickerTransition=false', () => {
            const snapshot = makeSnapshot({isEmojiPickerTransition: false});
            expect(t.guard!(snapshot, makeEvent())).toBe(false);
        });

        it('guard returns false when isDraggingKeyboard=true', () => {
            const snapshot = makeSnapshot({isEmojiPickerTransition: true, isDraggingKeyboard: true});
            expect(t.guard!(snapshot, makeEvent())).toBe(false);
        });

        it('guard returns false when isEmojiSearchActive=true', () => {
            const snapshot = makeSnapshot({isEmojiPickerTransition: true, isEmojiSearchActive: true});
            expect(t.guard!(snapshot, makeEvent())).toBe(false);
        });

        it('action interpolates height based on delta and progress', () => {
            // delta = targetHeight - keyboardEventHeight = 400 - 200 = 200
            // effectiveHeight = Math.round(400 - (200 * 0.5)) = 300
            const snapshot = makeSnapshot({targetHeight: 400, keyboardEventHeight: 200});
            const event = makeEvent({progress: 0.5});
            const result = t.action!(snapshot, event);
            expect(result).toEqual({
                inputAccessoryHeight: {value: 300, animated: false},
                postInputTranslateY: {value: 300, animated: false},
            });
        });

        it('action returns undefined when delta <= 0', () => {
            const snapshot = makeSnapshot({targetHeight: 200, keyboardEventHeight: 400});
            const result = t.action!(snapshot, makeEvent({progress: 0.5}));
            expect(result).toBeUndefined();
        });

        it('action returns undefined when progress is undefined', () => {
            const snapshot = makeSnapshot({targetHeight: 400, keyboardEventHeight: 200});
            const result = t.action!(snapshot, makeEvent({progress: undefined}));
            expect(result).toBeUndefined();
        });
    });

    describe('[1] EMOJI_TO_KEYBOARD → KEYBOARD_EVENT_MOVE → EMOJI_TO_KEYBOARD (fallback guard)', () => {
        const t = emojiToKeyboardTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
        });

        it('guard returns true when isEmojiSearchActive=false', () => {
            expect(t.guard!(makeSnapshot({isEmojiSearchActive: false}), makeEvent())).toBe(true);
        });

        it('guard returns false when isEmojiSearchActive=true', () => {
            expect(t.guard!(makeSnapshot({isEmojiSearchActive: true}), makeEvent())).toBe(false);
        });

        it('action sets inputAccessoryHeight and targetHeight to event.height', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 280, rawHeight: undefined});
            const result = t.action!(snapshot, event);
            expect(result).toMatchObject({
                inputAccessoryHeight: {value: 280, animated: false},
                targetHeight: {value: 280, animated: false},
            });
        });

        it('action falls back to snapshot.keyboardEventHeight when event.height is undefined', () => {
            const snapshot = makeSnapshot({keyboardEventHeight: 300});
            const event = makeEvent({height: undefined, rawHeight: undefined});
            const result = t.action!(snapshot, event);
            expect(result).toMatchObject({
                inputAccessoryHeight: {value: 300, animated: false},
                targetHeight: {value: 300, animated: false},
            });
        });

        it('action calls calculateKeyboardUpdates when rawHeight is defined', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 280, rawHeight: 330});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 280, 330);
        });

        it('action does not call calculateKeyboardUpdates when rawHeight is undefined', () => {
            const snapshot = makeSnapshot();
            const event = makeEvent({height: 280, rawHeight: undefined});
            t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).not.toHaveBeenCalled();
        });
    });

    describe('[2] EMOJI_TO_KEYBOARD → KEYBOARD_EVENT_END → KEYBOARD_OPEN (isSoftwareKeyboard guard)', () => {
        const t = emojiToKeyboardTransitions[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.KEYBOARD_OPEN);
        });

        it('uses isSoftwareKeyboard as guard', () => {
            expect(t.guard).toBe(isSoftwareKeyboard);
        });

        it('action returns isDraggingKeyboard=false and isEmojiSearchActive=false', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                isDraggingKeyboard: {value: false, animated: false},
                isEmojiSearchActive: {value: false, animated: false},
            });
        });
    });

    describe('[3] EMOJI_TO_KEYBOARD → KEYBOARD_EVENT_END → IDLE (isZeroHeight guard)', () => {
        const t = emojiToKeyboardTransitions[3];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('uses isZeroHeight as guard', () => {
            expect(t.guard).toBe(isZeroHeight);
        });

        it('action returns isDraggingKeyboard=false, isEmojiSearchActive=false, and animated postInputTranslateY=0', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                isDraggingKeyboard: {value: false, animated: false},
                isEmojiSearchActive: {value: false, animated: false},
                postInputTranslateY: {value: 0, animated: true},
            });
        });
    });

    describe('[4] EMOJI_TO_KEYBOARD → USER_OPEN_EMOJI → EMOJI_PICKER_OPEN', () => {
        const t = emojiToKeyboardTransitions[4];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
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
});
