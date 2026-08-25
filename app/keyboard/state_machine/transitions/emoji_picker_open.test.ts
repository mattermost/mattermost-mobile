// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {calculateKeyboardUpdates, getEmojiSearchActiveHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {emojiPickerOpenTransitions, emojiPickerOpenTransitionsNonEdgeToEdge} from './emoji_picker_open';

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
        currentState: InputContainerStateType.EMOJI_PICKER_OPEN,
        lastKeyboardHeight: 0,
        keyboardEventHeight: 0,
        inputAccessoryHeight: 300,
        postInputTranslateY: 300,
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

describe('emojiPickerOpenTransitionsNonEdgeToEdge', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getEmojiSearchActiveHeight as jest.Mock).mockReturnValue(150);
    });

    describe('[0] EMOJI_PICKER_OPEN → USER_FOCUS_EMOJI_SEARCH → EMOJI_SEARCH_ACTIVE', () => {
        const t = emojiPickerOpenTransitionsNonEdgeToEdge[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_EMOJI_SEARCH);
            expect(t.to).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
        });

        it('action calls getEmojiSearchActiveHeight and returns inputAccessoryHeight and targetHeight', () => {
            const snapshot = makeSnapshot({tabBarHeight: 49, safeAreaBottom: 0});
            const result = t.action!(snapshot, makeEvent());
            expect(getEmojiSearchActiveHeight).toHaveBeenCalledWith(49, 0);
            expect(result).toEqual({
                inputAccessoryHeight: {value: 150, animated: true},
                targetHeight: {value: 150, animated: false},
            });
        });
    });

    describe('[1] EMOJI_PICKER_OPEN → USER_FOCUS_INPUT → IDLE', () => {
        const t = emojiPickerOpenTransitionsNonEdgeToEdge[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('action returns inputAccessoryHeight=0 and targetHeight=0 both animated', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
            });
        });
    });

    describe('[2] EMOJI_PICKER_OPEN → USER_CLOSE_EMOJI → IDLE', () => {
        const t = emojiPickerOpenTransitionsNonEdgeToEdge[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_CLOSE_EMOJI);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('action returns inputAccessoryHeight=0 and targetHeight=0', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
            });
        });
    });
});

describe('emojiPickerOpenTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (calculateKeyboardUpdates as jest.Mock).mockImplementation((snapshot, height) => ({
            postInputTranslateY: {value: height, animated: false},
        }));
    });

    describe('[0] EMOJI_PICKER_OPEN → KEYBOARD_EVENT_MOVE → EMOJI_PICKER_OPEN', () => {
        const t = emojiPickerOpenTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('when isEmojiSearchActive=true: interpolates height when rawHeight/height/progress all defined', () => {
            const snapshot = makeSnapshot({isEmojiSearchActive: true, inputAccessoryHeight: 400, targetHeight: 300});
            const event = makeEvent({rawHeight: 200, height: 200, progress: 0.5});

            // pickerHeight = Math.max(300, 400 - ((400 - 300) * (1 - 0.5))) = Math.max(300, 400 - 50) = 350
            const result = t.action!(snapshot, event);
            expect(result).toEqual({
                inputAccessoryHeight: {value: 350, animated: false},
                postInputTranslateY: {value: 350, animated: false},
            });
        });

        it('when isEmojiSearchActive=true: returns undefined when any of rawHeight/height/progress is undefined', () => {
            const snapshot = makeSnapshot({isEmojiSearchActive: true});
            expect(t.action!(snapshot, makeEvent({rawHeight: undefined, height: 200, progress: 0.5}))).toBeUndefined();
            expect(t.action!(snapshot, makeEvent({rawHeight: 200, height: undefined, progress: 0.5}))).toBeUndefined();
            expect(t.action!(snapshot, makeEvent({rawHeight: 200, height: 200, progress: undefined}))).toBeUndefined();
        });

        it('when isEmojiSearchActive=false and rawHeight=0: returns undefined', () => {
            const snapshot = makeSnapshot({isEmojiSearchActive: false});
            const result = t.action!(snapshot, makeEvent({rawHeight: 0, height: 0}));
            expect(result).toBeUndefined();
        });

        it('when isEmojiSearchActive=false and rawHeight>0: sets inputAccessoryHeight and targetHeight and calls calculateKeyboardUpdates', () => {
            const snapshot = makeSnapshot({isEmojiSearchActive: false});
            const event = makeEvent({rawHeight: 330, height: 280});
            const result = t.action!(snapshot, event);
            expect(calculateKeyboardUpdates).toHaveBeenCalledWith(snapshot, 280, 330);
            expect(result).toMatchObject({
                inputAccessoryHeight: {value: 280, animated: false},
                targetHeight: {value: 280, animated: false},
            });
        });
    });

    describe('[1] EMOJI_PICKER_OPEN → KEYBOARD_EVENT_START → IDLE', () => {
        const t = emojiPickerOpenTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_START);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('guard returns true when rawHeight defined, rawHeight < 75, and not isWaitingForKeyboard', () => {
            const snapshot = makeSnapshot({isWaitingForKeyboard: false});
            expect(t.guard!(snapshot, makeEvent({rawHeight: 50}))).toBe(true);
        });

        it('guard returns false when rawHeight is undefined', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({rawHeight: undefined}))).toBe(false);
        });

        it('guard returns false when rawHeight >= 75', () => {
            expect(t.guard!(makeSnapshot(), makeEvent({rawHeight: 75}))).toBe(false);
            expect(t.guard!(makeSnapshot(), makeEvent({rawHeight: 300}))).toBe(false);
        });

        it('guard returns false when isWaitingForKeyboard=true', () => {
            const snapshot = makeSnapshot({isWaitingForKeyboard: true});
            expect(t.guard!(snapshot, makeEvent({rawHeight: 50}))).toBe(false);
        });

        it('action returns inputAccessoryHeight=0, targetHeight=0, postInputTranslateY=0, isEmojiPickerTransition=false', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: false},
                targetHeight: {value: 0, animated: false},
                postInputTranslateY: {value: 0, animated: true},
                isEmojiPickerTransition: {value: false, animated: false},
            });
        });
    });

    describe('[2] EMOJI_PICKER_OPEN → USER_FOCUS_INPUT → EMOJI_TO_KEYBOARD', () => {
        const t = emojiPickerOpenTransitions[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
        });

        it('guard returns true when hasZeroKeyboardHeight=false', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: false}), makeEvent())).toBe(true);
        });

        it('guard returns true when hasZeroKeyboardHeight=true but lastKeyboardHeight > 0', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: true, lastKeyboardHeight: 300}), makeEvent())).toBe(true);
        });

        it('guard returns false when hasZeroKeyboardHeight=true and lastKeyboardHeight=0', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: true, lastKeyboardHeight: 0}), makeEvent())).toBe(false);
        });
    });

    describe('[3] EMOJI_PICKER_OPEN → USER_FOCUS_INPUT → IDLE (hasZeroKeyboardHeight guard)', () => {
        const t = emojiPickerOpenTransitions[3];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('guard returns true when hasZeroKeyboardHeight=true', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: true}), makeEvent())).toBe(true);
        });

        it('guard returns false when hasZeroKeyboardHeight=false', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: false}), makeEvent())).toBe(false);
        });

        it('action returns reset heights plus isEmojiPickerTransition=true', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: true},
                postInputTranslateY: {value: 0, animated: true},
                scrollOffset: {value: 0, animated: true},
                isEmojiPickerTransition: {value: true, animated: false},
            });
        });
    });

    describe('[4] EMOJI_PICKER_OPEN → USER_CLOSE_EMOJI → IDLE', () => {
        const t = emojiPickerOpenTransitions[4];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_CLOSE_EMOJI);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('action returns inputAccessoryHeight=0, targetHeight=0, postInputTranslateY=0', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
                postInputTranslateY: {value: 0, animated: true},
            });
        });
    });

    describe('[5] EMOJI_PICKER_OPEN → USER_FOCUS_EMOJI_SEARCH → EMOJI_SEARCH_ACTIVE', () => {
        const t = emojiPickerOpenTransitions[5];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_EMOJI_SEARCH);
            expect(t.to).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
        });

        it('should have no action', () => {
            expect(t.action).toBeUndefined();
        });
    });

    describe('[6] EMOJI_PICKER_OPEN → KEYBOARD_EVENT_END → EMOJI_PICKER_OPEN', () => {
        const t = emojiPickerOpenTransitions[6];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('action always returns preSearchHeight=0, isEmojiSearchActive=false, isWaitingForKeyboard=false', () => {
            const result = t.action!(makeSnapshot({isEmojiSearchActive: false}), makeEvent());
            expect(result).toMatchObject({
                preSearchHeight: {value: 0, animated: false},
                isEmojiSearchActive: {value: false, animated: false},
                isWaitingForKeyboard: {value: false, animated: false},
            });
        });

        it('action snaps inputAccessoryHeight and postInputTranslateY to targetHeight when isEmojiSearchActive=true', () => {
            const snapshot = makeSnapshot({isEmojiSearchActive: true, targetHeight: 400});
            const result = t.action!(snapshot, makeEvent());
            expect(result).toMatchObject({
                inputAccessoryHeight: {value: 400, animated: false},
                postInputTranslateY: {value: 400, animated: false},
            });
        });

        it('action does not set inputAccessoryHeight or postInputTranslateY when isEmojiSearchActive=false', () => {
            const result = t.action!(makeSnapshot({isEmojiSearchActive: false}), makeEvent()) as Record<string, unknown>;
            expect(result).not.toHaveProperty('inputAccessoryHeight');
            expect(result).not.toHaveProperty('postInputTranslateY');
        });
    });
});
