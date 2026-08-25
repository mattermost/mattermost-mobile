// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Platform} from 'react-native';

import {InputContainerStateType} from '@keyboard';
import {DEFAULT_INPUT_ACCESSORY_HEIGHT} from '@keyboard/constants';

import {
    enterEmojiPickerOpen,
    enterEmojiSearchActive,
    enterIdle,
    enterKeyboardOpen,
    exitEmojiPickerToIdle,
    exitEmojiPickerToKeyboard,
    exitEmojiSearchToIdle,
    exitEmojiSearchToKeyboard,
    exitEmojiSearchToPickerOpen,
    exitKeyboardOpenToIdle,
    getStateEntryAction,
    getStateExitAction,
} from './actions';

import type {StateSnapshot} from '@keyboard/state_machine/types';

jest.mock('@constants/device', () => ({isEdgeToEdge: false}));
jest.mock('react-native-reanimated', () => ({
    ...jest.requireActual('react-native-reanimated'),
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
}));
jest.mock('@constants/events', () => ({
    __esModule: true,
    default: {EMOJI_PICKER_SEARCH_FOCUSED: 'EMOJI_PICKER_SEARCH_FOCUSED'},
}));

function makeSnapshot(overrides: Partial<StateSnapshot> = {}): StateSnapshot {
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
        isEmojiPickerTransition: false,
        isEmojiSearchActive: false,
        isDraggingKeyboard: false,
        isWaitingForKeyboard: false,
        hasZeroKeyboardHeight: false,
        postInputContainerHeight: 0,
        ...overrides,
    };
}

describe('enterEmojiPickerOpen', () => {
    afterEach(() => {
        (Platform as {OS: string}).OS = 'ios';
    });

    it('should use lastKeyboardHeight when fromState=IDLE and lastKeyboardHeight>0', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({lastKeyboardHeight: 300});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.IDLE);
        expect(result.targetHeight).toEqual({value: 300, animated: false});
        expect(result.inputAccessoryHeight).toEqual({value: 300, animated: true});
        expect(result.postInputTranslateY).toBeUndefined();
    });

    it('should use DEFAULT_INPUT_ACCESSORY_HEIGHT when fromState=IDLE and lastKeyboardHeight=0', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({lastKeyboardHeight: 0});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.IDLE);
        expect(result.targetHeight).toEqual({value: DEFAULT_INPUT_ACCESSORY_HEIGHT, animated: false});
        expect(result.inputAccessoryHeight).toEqual({value: DEFAULT_INPUT_ACCESSORY_HEIGHT, animated: true});
    });

    it('should set postInputTranslateY and scrollOffset on iOS with isEdgeToEdge=true when fromState=IDLE', () => {
        jest.resetModules();
        jest.doMock('@constants/device', () => ({isEdgeToEdge: true}));
        jest.doMock('react-native-reanimated', () => ({
            ...jest.requireActual('react-native-reanimated'),
            runOnJS: (fn: (...args: unknown[]) => void) => fn,
        }));
        jest.doMock('@constants/events', () => ({
            default: {EMOJI_PICKER_SEARCH_FOCUSED: 'EMOJI_PICKER_SEARCH_FOCUSED'},
        }));
        (Platform as {OS: string}).OS = 'ios';

        const {enterEmojiPickerOpen: eep} = require('./actions');
        const snapshot = makeSnapshot({lastKeyboardHeight: 300});
        const result = eep(snapshot, undefined, InputContainerStateType.IDLE);
        expect(result.postInputTranslateY).toEqual({value: 300, animated: true});
        expect(result.scrollOffset).toEqual({value: 300, animated: true});
        jest.resetModules();
    });

    it('should return only targetHeight when fromState=EMOJI_SEARCH_ACTIVE', () => {
        const snapshot = makeSnapshot({preSearchHeight: 250});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.EMOJI_SEARCH_ACTIVE);
        expect(result.targetHeight).toEqual({value: 250, animated: false});
        expect(result.inputAccessoryHeight).toBeUndefined();
        expect(result.postInputTranslateY).toBeUndefined();
    });

    it('should use lastKeyboardHeight for KEYBOARD_TO_EMOJI when lastKeyboardHeight>0', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({lastKeyboardHeight: 320});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.KEYBOARD_TO_EMOJI);
        expect(result.targetHeight).toEqual({value: 320, animated: false});
        expect(result.inputAccessoryHeight).toEqual({value: 320, animated: false});
        expect(result.postInputTranslateY).toEqual({value: 320, animated: false});
        expect(result.scrollOffset).toBeUndefined();
    });

    it('should use postInputTranslateY for KEYBOARD_TO_EMOJI when lastKeyboardHeight=0 and postInputTranslateY>0', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({lastKeyboardHeight: 0, postInputTranslateY: 310});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.KEYBOARD_TO_EMOJI);
        expect(result.targetHeight).toEqual({value: 310, animated: false});
        expect(result.postInputTranslateY).toEqual({value: 310, animated: false});
    });

    it('should use inputAccessoryHeight for KEYBOARD_TO_EMOJI when both lastKeyboardHeight and postInputTranslateY are 0', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({lastKeyboardHeight: 0, postInputTranslateY: 0, inputAccessoryHeight: 305});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.KEYBOARD_TO_EMOJI);
        expect(result.targetHeight).toEqual({value: 305, animated: false});
    });

    it('should set scrollOffset on iOS for KEYBOARD_TO_EMOJI', () => {
        (Platform as {OS: string}).OS = 'ios';
        const snapshot = makeSnapshot({lastKeyboardHeight: 320});
        const result = enterEmojiPickerOpen(snapshot, undefined, InputContainerStateType.KEYBOARD_TO_EMOJI);
        expect(result.scrollOffset).toEqual({value: 320, animated: false});
    });
});

describe('enterIdle', () => {
    it('should return all cleared flag updates', () => {
        const result = enterIdle();
        expect(result.isReconcilerPaused).toEqual({value: false, animated: false});
        expect(result.isWaitingForKeyboard).toEqual({value: false, animated: false});
        expect(result.isEmojiPickerTransition).toEqual({value: false, animated: false});
        expect(result.isEmojiSearchActive).toEqual({value: false, animated: false});
        expect(result.isDraggingKeyboard).toEqual({value: false, animated: false});
    });
});

describe('enterKeyboardOpen', () => {
    afterEach(() => {
        (Platform as {OS: string}).OS = 'ios';
    });

    it('should set lastKeyboardHeight and targetHeight when height>75 and not dragging', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({isEmojiPickerTransition: false, isDraggingKeyboard: false});
        const event = {type: 'KEYBOARD_EVENT_END' as never, height: 300};
        const result = enterKeyboardOpen(snapshot, event);
        expect(result.lastKeyboardHeight).toEqual({value: 300, animated: false});
        expect(result.targetHeight).toEqual({value: 300, animated: false});
        expect(result.isEmojiPickerTransition).toEqual({value: false, animated: false});
    });

    it('should not set lastKeyboardHeight when isDraggingKeyboard=true', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({isEmojiPickerTransition: false, isDraggingKeyboard: true});
        const event = {type: 'KEYBOARD_EVENT_END' as never, height: 300};
        const result = enterKeyboardOpen(snapshot, event);
        expect(result.lastKeyboardHeight).toBeUndefined();
        expect(result.targetHeight).toEqual({value: 300, animated: false});
    });

    it('should set postInputTranslateY and scrollOffset on iOS when wasGuarded=true', () => {
        (Platform as {OS: string}).OS = 'ios';
        const snapshot = makeSnapshot({isEmojiPickerTransition: true, keyboardEventHeight: 300, isEmojiSearchActive: false});
        const result = enterKeyboardOpen(snapshot);
        expect(result.postInputTranslateY).toEqual({value: 300, animated: false});
        expect(result.scrollOffset).toEqual({value: 300, animated: false});
    });

    it('should animate postInputTranslateY when wasGuarded=true and isEmojiSearchActive=true', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({isEmojiPickerTransition: true, keyboardEventHeight: 300, isEmojiSearchActive: true});
        const result = enterKeyboardOpen(snapshot);
        expect(result.postInputTranslateY).toEqual({value: 300, animated: true});
    });

    it('should only clear isEmojiPickerTransition when height <= 0', () => {
        const snapshot = makeSnapshot({isEmojiPickerTransition: false, keyboardEventHeight: 0});
        const event = {type: 'KEYBOARD_EVENT_END' as never, height: 0};
        const result = enterKeyboardOpen(snapshot, event);
        expect(result.isEmojiPickerTransition).toEqual({value: false, animated: false});
        expect(result.lastKeyboardHeight).toBeUndefined();
        expect(result.targetHeight).toBeUndefined();
    });

    it('should set targetHeight only when height > 0 and <= MIN_KEYBOARD_HEIGHT and not guarded', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({isEmojiPickerTransition: false});
        const event = {type: 'KEYBOARD_EVENT_END' as never, height: 50};
        const result = enterKeyboardOpen(snapshot, event);
        expect(result.targetHeight).toEqual({value: 50, animated: false});
        expect(result.lastKeyboardHeight).toBeUndefined();
    });
});

describe('enterEmojiSearchActive', () => {
    it('should capture inputAccessoryHeight as preSearchHeight and emit event', async () => {
        const snapshot = makeSnapshot({inputAccessoryHeight: 300});
        const result = enterEmojiSearchActive(snapshot);
        expect(result.preSearchHeight).toEqual({value: 300, animated: false});
        expect(result.isEmojiSearchActive).toEqual({value: true, animated: false});
        await Promise.resolve();
        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('EMOJI_PICKER_SEARCH_FOCUSED', true);
    });
});

describe('exitEmojiSearchToPickerOpen', () => {
    it('should return targetHeight=preSearchHeight, clear preSearchHeight, set isWaitingForKeyboard, and emit event', async () => {
        const snapshot = makeSnapshot({preSearchHeight: 280});
        const result = exitEmojiSearchToPickerOpen(snapshot);
        expect(result.targetHeight?.value).toBe(280);
        expect(result.targetHeight?.animated).toBe(true);
        expect(result.preSearchHeight).toEqual({value: 0, animated: false});
        expect(result.isWaitingForKeyboard).toEqual({value: true, animated: false});
        await Promise.resolve();
        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('EMOJI_PICKER_SEARCH_FOCUSED', false);
    });
});

describe('exitEmojiSearchToKeyboard', () => {
    it('should clear preSearchHeight and set targetHeight to preSearchHeight, and emit event', async () => {
        const snapshot = makeSnapshot({preSearchHeight: 290});
        const result = exitEmojiSearchToKeyboard(snapshot);
        expect(result.preSearchHeight).toEqual({value: 0, animated: false});
        expect(result.targetHeight).toEqual({value: 290, animated: false});
        await Promise.resolve();
        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('EMOJI_PICKER_SEARCH_FOCUSED', false);
    });
});

describe('exitEmojiSearchToIdle', () => {
    it('should set isReconcilerPaused and clear preSearchHeight, and emit event', async () => {
        const result = exitEmojiSearchToIdle();
        expect(result.isReconcilerPaused).toEqual({value: true, animated: false});
        expect(result.preSearchHeight).toEqual({value: 0, animated: false});
        await Promise.resolve();
        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('EMOJI_PICKER_SEARCH_FOCUSED', false);
    });
});

describe('exitEmojiPickerToKeyboard', () => {
    it('should set isEmojiPickerTransition to true', () => {
        const result = exitEmojiPickerToKeyboard();
        expect(result).toBeDefined();
        expect(result!.isEmojiPickerTransition).toEqual({value: true, animated: false});
    });
});

describe('exitEmojiPickerToIdle', () => {
    it('should animate inputAccessoryHeight when not dragging', () => {
        const snapshot = makeSnapshot({isDraggingKeyboard: false, hasZeroKeyboardHeight: false});
        const result = exitEmojiPickerToIdle(snapshot);
        expect(result.inputAccessoryHeight).toEqual({value: 0, animated: true});
        expect(result.targetHeight).toEqual({value: 0, animated: false});
        expect(result.postInputTranslateY).toEqual({value: 0, animated: false});
    });

    it('should not animate inputAccessoryHeight when dragging', () => {
        const snapshot = makeSnapshot({isDraggingKeyboard: true, hasZeroKeyboardHeight: false});
        const result = exitEmojiPickerToIdle(snapshot);
        expect(result.inputAccessoryHeight).toEqual({value: 0, animated: false});
    });

    it('should not set targetHeight or postInputTranslateY when hasZeroKeyboardHeight=true', () => {
        const snapshot = makeSnapshot({isDraggingKeyboard: false, hasZeroKeyboardHeight: true});
        const result = exitEmojiPickerToIdle(snapshot);
        expect(result.targetHeight).toBeUndefined();
        expect(result.postInputTranslateY).toBeUndefined();
    });

    it('should include common updates for both dragging and non-dragging', () => {
        const snapshot = makeSnapshot({isDraggingKeyboard: false, hasZeroKeyboardHeight: false});
        const result = exitEmojiPickerToIdle(snapshot);
        expect(result.isReconcilerPaused).toEqual({value: true, animated: false});
        expect(result.isDraggingKeyboard).toEqual({value: false, animated: false});
        expect(result.isEmojiPickerTransition).toEqual({value: false, animated: false});
    });
});

describe('exitKeyboardOpenToIdle', () => {
    afterEach(() => {
        (Platform as {OS: string}).OS = 'ios';
    });

    it('should compute scrollPosition using lastKeyboardHeight when isDraggingKeyboard=true on iOS', () => {
        (Platform as {OS: string}).OS = 'ios';
        const snapshot = makeSnapshot({
            isDraggingKeyboard: true,
            scrollPosition: 500,
            lastKeyboardHeight: 300,
            postInputTranslateY: 150,
        });
        const result = exitKeyboardOpenToIdle(snapshot);
        expect(result.scrollPosition).toEqual({value: 200, animated: false});
    });

    it('should compute scrollPosition using postInputTranslateY when not dragging on iOS', () => {
        (Platform as {OS: string}).OS = 'ios';
        const snapshot = makeSnapshot({
            isDraggingKeyboard: false,
            scrollPosition: 500,
            lastKeyboardHeight: 300,
            postInputTranslateY: 150,
        });
        const result = exitKeyboardOpenToIdle(snapshot);
        expect(result.scrollPosition).toEqual({value: 350, animated: false});
    });

    it('should not set scrollPosition on Android', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot({scrollPosition: 500, lastKeyboardHeight: 300, postInputTranslateY: 150});
        const result = exitKeyboardOpenToIdle(snapshot);
        expect(result.scrollPosition).toBeUndefined();
    });

    it('should always set isReconcilerPaused, postInputTranslateY=0, targetHeight=0', () => {
        (Platform as {OS: string}).OS = 'android';
        const snapshot = makeSnapshot();
        const result = exitKeyboardOpenToIdle(snapshot);
        expect(result.isReconcilerPaused).toEqual({value: true, animated: false});
        expect(result.postInputTranslateY).toEqual({value: 0, animated: false});
        expect(result.targetHeight).toEqual({value: 0, animated: false});
    });
});

describe('getStateEntryAction', () => {
    it('should return enterIdle for IDLE state', () => {
        expect(getStateEntryAction(InputContainerStateType.IDLE)).toBe(enterIdle);
    });

    it('should return enterKeyboardOpen for KEYBOARD_OPEN state', () => {
        expect(getStateEntryAction(InputContainerStateType.KEYBOARD_OPEN)).toBe(enterKeyboardOpen);
    });

    it('should return enterEmojiPickerOpen for EMOJI_PICKER_OPEN state', () => {
        expect(getStateEntryAction(InputContainerStateType.EMOJI_PICKER_OPEN)).toBe(enterEmojiPickerOpen);
    });

    it('should return enterEmojiPickerOpen for KEYBOARD_TO_EMOJI state', () => {
        expect(getStateEntryAction(InputContainerStateType.KEYBOARD_TO_EMOJI)).toBe(enterEmojiPickerOpen);
    });

    it('should return enterEmojiSearchActive for EMOJI_SEARCH_ACTIVE state', () => {
        expect(getStateEntryAction(InputContainerStateType.EMOJI_SEARCH_ACTIVE)).toBe(enterEmojiSearchActive);
    });

    it('should return undefined for KEYBOARD_OPENING state', () => {
        expect(getStateEntryAction(InputContainerStateType.KEYBOARD_OPENING)).toBeUndefined();
    });

    it('should return undefined for unknown state', () => {
        expect(getStateEntryAction('UNKNOWN')).toBeUndefined();
    });
});

describe('getStateExitAction', () => {
    it('should return exitEmojiSearchToPickerOpen for EMOJI_SEARCH_ACTIVE → EMOJI_PICKER_OPEN', () => {
        expect(getStateExitAction(InputContainerStateType.EMOJI_SEARCH_ACTIVE, InputContainerStateType.EMOJI_PICKER_OPEN)).toBe(exitEmojiSearchToPickerOpen);
    });

    it('should return exitEmojiSearchToKeyboard for EMOJI_SEARCH_ACTIVE → EMOJI_TO_KEYBOARD', () => {
        expect(getStateExitAction(InputContainerStateType.EMOJI_SEARCH_ACTIVE, InputContainerStateType.EMOJI_TO_KEYBOARD)).toBe(exitEmojiSearchToKeyboard);
    });

    it('should return exitEmojiSearchToIdle for EMOJI_SEARCH_ACTIVE → IDLE', () => {
        expect(getStateExitAction(InputContainerStateType.EMOJI_SEARCH_ACTIVE, InputContainerStateType.IDLE)).toBe(exitEmojiSearchToIdle);
    });

    it('should return exitEmojiPickerToIdle for EMOJI_TO_KEYBOARD → IDLE', () => {
        expect(getStateExitAction(InputContainerStateType.EMOJI_TO_KEYBOARD, InputContainerStateType.IDLE)).toBe(exitEmojiPickerToIdle);
    });

    it('should return exitEmojiPickerToIdle for EMOJI_PICKER_OPEN → IDLE', () => {
        expect(getStateExitAction(InputContainerStateType.EMOJI_PICKER_OPEN, InputContainerStateType.IDLE)).toBe(exitEmojiPickerToIdle);
    });

    it('should return exitEmojiPickerToKeyboard for EMOJI_PICKER_OPEN → EMOJI_TO_KEYBOARD', () => {
        expect(getStateExitAction(InputContainerStateType.EMOJI_PICKER_OPEN, InputContainerStateType.EMOJI_TO_KEYBOARD)).toBe(exitEmojiPickerToKeyboard);
    });

    it('should return exitKeyboardOpenToIdle for KEYBOARD_OPEN → IDLE', () => {
        expect(getStateExitAction(InputContainerStateType.KEYBOARD_OPEN, InputContainerStateType.IDLE)).toBe(exitKeyboardOpenToIdle);
    });

    it('should return undefined for unhandled transition combinations', () => {
        expect(getStateExitAction(InputContainerStateType.IDLE, InputContainerStateType.KEYBOARD_OPEN)).toBeUndefined();
        expect(getStateExitAction(InputContainerStateType.KEYBOARD_OPEN, InputContainerStateType.EMOJI_PICKER_OPEN)).toBeUndefined();
    });
});
