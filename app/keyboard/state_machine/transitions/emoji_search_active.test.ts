// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {calculateSearchHeight, isZeroHeight} from '@keyboard/state_machine/keyboard_utils';
import {InputContainerStateType, StateMachineEventType, type StateSnapshot, type StateEvent} from '@keyboard/state_machine/types';

import {emojiSearchActiveTransitions, emojiSearchActiveTransitionsNonEdgeToEdge} from './emoji_search_active';

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
        currentState: InputContainerStateType.EMOJI_SEARCH_ACTIVE,
        lastKeyboardHeight: 300,
        keyboardEventHeight: 300,
        inputAccessoryHeight: 450,
        postInputTranslateY: 450,
        targetHeight: 450,
        preSearchHeight: 300,
        tabBarHeight: 49,
        safeAreaBottom: 0,
        scrollPosition: 0,
        scrollOffset: 0,
        postInputContainerHeight: 0,
        isEmojiPickerTransition: false,
        isEmojiSearchActive: true,
        isDraggingKeyboard: false,
        isWaitingForKeyboard: false,
        hasZeroKeyboardHeight: false,
        ...overrides,
    };
}

function makeEvent(overrides: Partial<StateEvent> = {}): StateEvent {
    return {type: StateMachineEventType.KEYBOARD_EVENT_END, ...overrides};
}

describe('emojiSearchActiveTransitionsNonEdgeToEdge', () => {
    describe('[0] EMOJI_SEARCH_ACTIVE → USER_BLUR_EMOJI_SEARCH → EMOJI_PICKER_OPEN', () => {
        const t = emojiSearchActiveTransitionsNonEdgeToEdge[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_BLUR_EMOJI_SEARCH);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('action returns inputAccessoryHeight and targetHeight set to preSearchHeight, and resets preSearchHeight', () => {
            const snapshot = makeSnapshot({preSearchHeight: 300});
            const result = t.action!(snapshot, makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 300, animated: true},
                targetHeight: {value: 300, animated: false},
                preSearchHeight: {value: 0, animated: false},
            });
        });
    });

    describe('[1] EMOJI_SEARCH_ACTIVE → USER_CLOSE_EMOJI → IDLE', () => {
        const t = emojiSearchActiveTransitionsNonEdgeToEdge[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_CLOSE_EMOJI);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('should have no action', () => {
            expect(t.action).toBeUndefined();
        });
    });

    describe('[2] EMOJI_SEARCH_ACTIVE → USER_FOCUS_INPUT → IDLE', () => {
        const t = emojiSearchActiveTransitionsNonEdgeToEdge[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('action returns inputAccessoryHeight=0 (animated) and targetHeight=0', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: false},
            });
        });
    });
});

describe('emojiSearchActiveTransitions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isZeroHeight as jest.Mock).mockReturnValue(false);
        (calculateSearchHeight as jest.Mock).mockImplementation((kbH) => kbH + 150);
    });

    describe('[0] EMOJI_SEARCH_ACTIVE → KEYBOARD_EVENT_START → EMOJI_SEARCH_ACTIVE', () => {
        const t = emojiSearchActiveTransitions[0];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_START);
            expect(t.to).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
        });

        it('action calls calculateSearchHeight and returns targetHeight, lastKeyboardHeight, keyboardEventHeight', () => {
            const snapshot = makeSnapshot({tabBarHeight: 49, safeAreaBottom: 0});
            const event = makeEvent({rawHeight: 350, height: 300, type: StateMachineEventType.KEYBOARD_EVENT_START});
            const result = t.action!(snapshot, event);
            expect(calculateSearchHeight).toHaveBeenCalledWith(300, 49, 0);
            expect(result).toEqual({
                targetHeight: {value: 450, animated: false},
                lastKeyboardHeight: {value: 300, animated: false},
                keyboardEventHeight: {value: 350, animated: false},
            });
        });

        it('action returns undefined when rawHeight is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({rawHeight: undefined, height: 300}));
            expect(result).toBeUndefined();
        });

        it('action returns undefined when height is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({rawHeight: 350, height: undefined}));
            expect(result).toBeUndefined();
        });
    });

    describe('[1] EMOJI_SEARCH_ACTIVE → KEYBOARD_EVENT_MOVE → EMOJI_SEARCH_ACTIVE', () => {
        const t = emojiSearchActiveTransitions[1];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_MOVE);
            expect(t.to).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
        });

        it('action interpolates inputAccessoryHeight and postInputTranslateY from preSearchHeight to targetHeight', () => {
            // preSearchHeight=300, targetHeight=450, progress=0.5
            // searchHeight = 300 + ((450 - 300) * 0.5) = 375
            const snapshot = makeSnapshot({preSearchHeight: 300, targetHeight: 450});
            const event = makeEvent({rawHeight: 350, height: 300, progress: 0.5, type: StateMachineEventType.KEYBOARD_EVENT_MOVE});
            const result = t.action!(snapshot, event);
            expect(result).toEqual({
                inputAccessoryHeight: {value: 375, animated: false},
                postInputTranslateY: {value: 375, animated: false},
            });
        });

        it('action uses progress=0 when progress is undefined', () => {
            // preSearchHeight=300, targetHeight=450, progress=0 → searchHeight=300
            const snapshot = makeSnapshot({preSearchHeight: 300, targetHeight: 450});
            const event = makeEvent({rawHeight: 350, height: 300, progress: undefined, type: StateMachineEventType.KEYBOARD_EVENT_MOVE});
            const result = t.action!(snapshot, event);
            expect(result).toEqual({
                inputAccessoryHeight: {value: 300, animated: false},
                postInputTranslateY: {value: 300, animated: false},
            });
        });

        it('action returns undefined when rawHeight is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({rawHeight: undefined, height: 300, type: StateMachineEventType.KEYBOARD_EVENT_MOVE}));
            expect(result).toBeUndefined();
        });

        it('action returns undefined when height is undefined', () => {
            const result = t.action!(makeSnapshot(), makeEvent({rawHeight: 350, height: undefined, type: StateMachineEventType.KEYBOARD_EVENT_MOVE}));
            expect(result).toBeUndefined();
        });
    });

    describe('[2] EMOJI_SEARCH_ACTIVE → KEYBOARD_EVENT_END → EMOJI_SEARCH_ACTIVE', () => {
        const t = emojiSearchActiveTransitions[2];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.KEYBOARD_EVENT_END);
            expect(t.to).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
        });

        it('action sets inputAccessoryHeight and postInputTranslateY to targetHeight - tabBarHeight with animated=false when hasZeroKeyboardHeight=false', () => {
            const snapshot = makeSnapshot({targetHeight: 450, tabBarHeight: 49, hasZeroKeyboardHeight: false});
            const result = t.action!(snapshot, makeEvent()) as Record<string, unknown>;

            // targetHeight = 450 - 49 = 401
            expect(result).toMatchObject({
                isEmojiSearchActive: {value: true, animated: false},
                inputAccessoryHeight: {value: 401, animated: false},
                postInputTranslateY: {value: 401, animated: false},
            });
        });

        it('action sets animated=true for inputAccessoryHeight and postInputTranslateY when hasZeroKeyboardHeight=true', () => {
            const snapshot = makeSnapshot({targetHeight: 450, tabBarHeight: 49, hasZeroKeyboardHeight: true});
            const result = t.action!(snapshot, makeEvent()) as Record<string, unknown>;
            expect(result).toMatchObject({
                inputAccessoryHeight: {value: 401, animated: true},
                postInputTranslateY: {value: 401, animated: true},
            });
        });

        it('action includes scrollOffset on iOS', () => {
            (Platform as {OS: string}).OS = 'ios';
            const snapshot = makeSnapshot({targetHeight: 450, tabBarHeight: 49});
            const result = t.action!(snapshot, makeEvent()) as Record<string, unknown>;
            expect(result).toHaveProperty('scrollOffset');
            (Platform as {OS: string}).OS = 'android';
        });

        it('action does not include scrollOffset on Android', () => {
            (Platform as {OS: string}).OS = 'android';
            const snapshot = makeSnapshot({targetHeight: 450, tabBarHeight: 49});
            const result = t.action!(snapshot, makeEvent()) as Record<string, unknown>;
            expect(result).not.toHaveProperty('scrollOffset');
        });
    });

    describe('[3] EMOJI_SEARCH_ACTIVE → USER_BLUR_EMOJI_SEARCH → EMOJI_PICKER_OPEN (isZeroHeight guard)', () => {
        const t = emojiSearchActiveTransitions[3];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_BLUR_EMOJI_SEARCH);
            expect(t.to).toBe(InputContainerStateType.EMOJI_PICKER_OPEN);
        });

        it('uses isZeroHeight as guard', () => {
            expect(t.guard).toBe(isZeroHeight);
        });

        it('action returns inputAccessoryHeight and postInputTranslateY set to preSearchHeight (animated:true)', () => {
            const snapshot = makeSnapshot({preSearchHeight: 300});
            const result = t.action!(snapshot, makeEvent());
            expect(result).toMatchObject({
                inputAccessoryHeight: {value: 300, animated: true},
                postInputTranslateY: {value: 300, animated: true},
            });
        });

        it('action includes scrollOffset on iOS', () => {
            (Platform as {OS: string}).OS = 'ios';
            const snapshot = makeSnapshot({preSearchHeight: 300});
            const result = t.action!(snapshot, makeEvent()) as Record<string, unknown>;
            expect(result).toHaveProperty('scrollOffset', {value: 300, animated: true});
            (Platform as {OS: string}).OS = 'android';
        });

        it('action does not include scrollOffset on Android', () => {
            (Platform as {OS: string}).OS = 'android';
            const result = t.action!(makeSnapshot(), makeEvent()) as Record<string, unknown>;
            expect(result).not.toHaveProperty('scrollOffset');
        });
    });

    describe('[4] EMOJI_SEARCH_ACTIVE → USER_CLOSE_EMOJI → IDLE', () => {
        const t = emojiSearchActiveTransitions[4];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_CLOSE_EMOJI);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('should have no action', () => {
            expect(t.action).toBeUndefined();
        });
    });

    describe('[5] EMOJI_SEARCH_ACTIVE → USER_FOCUS_INPUT → EMOJI_TO_KEYBOARD', () => {
        const t = emojiSearchActiveTransitions[5];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.EMOJI_TO_KEYBOARD);
        });

        it('guard returns true when hasZeroKeyboardHeight=false', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: false}), makeEvent())).toBe(true);
        });

        it('guard returns false when hasZeroKeyboardHeight=true', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: true}), makeEvent())).toBe(false);
        });

        it('action returns inputAccessoryHeight and postInputTranslateY set to preSearchHeight (animated:true)', () => {
            const snapshot = makeSnapshot({preSearchHeight: 300});
            const result = t.action!(snapshot, makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 300, animated: true},
                postInputTranslateY: {value: 300, animated: true},
            });
        });
    });

    describe('[6] EMOJI_SEARCH_ACTIVE → USER_FOCUS_INPUT → IDLE (hasZeroKeyboardHeight guard)', () => {
        const t = emojiSearchActiveTransitions[6];

        it('should have correct from/event/to', () => {
            expect(t.from).toBe(InputContainerStateType.EMOJI_SEARCH_ACTIVE);
            expect(t.event).toBe(StateMachineEventType.USER_FOCUS_INPUT);
            expect(t.to).toBe(InputContainerStateType.IDLE);
        });

        it('guard returns true when hasZeroKeyboardHeight=true', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: true}), makeEvent())).toBe(true);
        });

        it('guard returns false when hasZeroKeyboardHeight=false', () => {
            expect(t.guard!(makeSnapshot({hasZeroKeyboardHeight: false}), makeEvent())).toBe(false);
        });

        it('action returns inputAccessoryHeight=0, targetHeight=0, postInputTranslateY=0 all animated:true', () => {
            const result = t.action!(makeSnapshot(), makeEvent());
            expect(result).toEqual({
                inputAccessoryHeight: {value: 0, animated: true},
                targetHeight: {value: 0, animated: true},
                postInputTranslateY: {value: 0, animated: true},
            });
        });
    });
});
