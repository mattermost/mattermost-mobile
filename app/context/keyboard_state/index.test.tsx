// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import React, {type PropsWithChildren} from 'react';
import {Platform} from 'react-native';

import {KeyboardStateProvider, useKeyboardState} from '@context/keyboard_state';
import {InputContainerStateType} from '@keyboard';

const mockStateContext = {
    isEnabled: {value: false},
    cursorPosition: {value: 0},
    postInputContainerHeight: {value: 91},
    currentState: {value: InputContainerStateType.IDLE},
    targetHeight: {value: 0},
    inputAccessoryHeight: {value: 0},
    keyboardEventHeight: {value: 0},
    preSearchHeight: {value: 0},
    lastKeyboardHeight: {value: 0},
    hasZeroKeyboardHeight: {value: false},
    isDraggingKeyboard: {value: false},
    isWaitingForKeyboard: {value: false},
    isEmojiPickerTransition: {value: false},
    isEmojiSearchActive: {value: false},
    isReconcilerPaused: {value: false},
    maxKeyboardProgress: {value: 0},
    postInputTranslateY: {value: 0},
    scrollOffset: {value: 0},
    scrollPosition: {value: 0},
    tabBarHeight: {value: 0},
    safeAreaBottom: {value: 0},
    processEvent: jest.fn(),
    isEmojiPickerActive: jest.fn(() => false),
};

jest.mock('@hooks/use_keyboard_state_context', () => ({
    useKeyboardStateContext: jest.fn(() => mockStateContext),
}));

const mockStateMachine = {
    onUserFocusInput: jest.fn(),
    onUserOpenEmoji: jest.fn(),
    onUserCloseEmoji: jest.fn(),
    onUserFocusEmojiSearch: jest.fn(),
    onUserBlurEmojiSearch: jest.fn(),
    isEmojiPickerActive: jest.fn(() => false),
};

jest.mock('@hooks/use_keyboard_state_machine', () => ({
    useKeyboardStateMachine: jest.fn(() => mockStateMachine),
}));

jest.mock('@hooks/use_keyboard_events', () => ({
    useKeyboardEvents: jest.fn(),
}));

const mockUseIsTablet = jest.fn(() => false);
jest.mock('@hooks/device', () => ({
    useIsTablet: () => mockUseIsTablet(),
}));

const mockDismissKeyboard = jest.fn(() => Promise.resolve());
jest.mock('@utils/keyboard', () => ({
    dismissKeyboard: () => mockDismissKeyboard(),
}));

function makeWrapper(props: {tabBarHeight?: number; enabled?: boolean} = {}) {
    const {tabBarHeight = 49, enabled = true} = props;
    return function Wrapper({children}: PropsWithChildren) {
        return (
            <KeyboardStateProvider
                tabBarHeight={tabBarHeight}
                enabled={enabled}
            >
                {children}
            </KeyboardStateProvider>
        );
    };
}

describe('KeyboardStateProvider', () => {
    beforeEach(() => {
        // Use fake timers for all tests to prevent pending timers (the 250ms
        // setTimeout in setIsEmojiSearchFocused and the enabled-sync effect)
        // from firing after the test ends and triggering unwrapped state updates.
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.clearAllMocks();

        // Reset shared value side-effects between tests
        mockStateContext.isEnabled.value = false;
        mockStateContext.cursorPosition.value = 0;
    });

    afterEach(() => {
        act(() => {
            jest.runAllTimers();
        });
        jest.useRealTimers();
    });

    describe('enabled prop → stateContext.isEnabled', () => {
        it('should sync the enabled prop to stateContext.isEnabled.value on mount', () => {
            renderHook(() => useKeyboardState(), {wrapper: makeWrapper({enabled: true})});

            expect(mockStateContext.isEnabled.value).toBe(true);
        });

        it('should not update stateContext.isEnabled.value when unmounted before effect runs', () => {
            // When enabled=false (default), isEnabled.value stays false after unmount
            const {unmount} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper({enabled: false})});

            unmount();

            expect(mockStateContext.isEnabled.value).toBe(false);
        });
    });

    describe('setIsEmojiSearchFocused', () => {
        it('should call stateMachine.onUserFocusEmojiSearch when focusing and not already focused', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });

            expect(mockStateMachine.onUserFocusEmojiSearch).toHaveBeenCalledTimes(1);
        });

        it('should NOT call stateMachine.onUserFocusEmojiSearch when already focused', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            // First focus call — sets isEmojiSearchFocused → true after 250ms
            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });
            act(() => {
                jest.advanceTimersByTime(300);
            });

            mockStateMachine.onUserFocusEmojiSearch.mockClear();

            // Second focus call when already focused — should NOT call onUserFocusEmojiSearch
            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });

            expect(mockStateMachine.onUserFocusEmojiSearch).not.toHaveBeenCalled();
        });

        it('should call stateMachine.onUserBlurEmojiSearch when blurring and currently focused', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            // Focus first, then wait for state to update
            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });
            act(() => {
                jest.advanceTimersByTime(300);
            });

            mockStateMachine.onUserBlurEmojiSearch.mockClear();

            act(() => {
                result.current.setIsEmojiSearchFocused(false);
            });

            expect(mockStateMachine.onUserBlurEmojiSearch).toHaveBeenCalledTimes(1);
        });

        it('should NOT call stateMachine.onUserBlurEmojiSearch when not focused', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setIsEmojiSearchFocused(false);
            });

            expect(mockStateMachine.onUserBlurEmojiSearch).not.toHaveBeenCalled();
        });

        it('should pass asHardwareKeyboard=true on iOS tablet with keyboard height=0 and state=0', () => {
            const originalOS = Platform.OS;
            (Platform as {OS: string}).OS = 'ios';
            mockUseIsTablet.mockReturnValue(true);

            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });

            expect(mockStateMachine.onUserFocusEmojiSearch).toHaveBeenCalledWith(true);

            (Platform as {OS: string}).OS = originalOS;
            mockUseIsTablet.mockReturnValue(false);
        });

        it('should pass asHardwareKeyboard=false on Android', () => {
            const originalOS = Platform.OS;
            (Platform as {OS: string}).OS = 'android';
            mockUseIsTablet.mockReturnValue(true);

            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });

            expect(mockStateMachine.onUserFocusEmojiSearch).toHaveBeenCalledWith(false);

            (Platform as {OS: string}).OS = originalOS;
            mockUseIsTablet.mockReturnValue(false);
        });
    });

    describe('closeInputAccessoryView', () => {
        it('should call dismissKeyboard AND stateMachine.onUserCloseEmoji when isEmojiSearchFocused=true', async () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setIsEmojiSearchFocused(true);
            });
            act(() => {
                jest.advanceTimersByTime(300);
            });

            await act(async () => {
                result.current.closeInputAccessoryView();
            });

            expect(mockDismissKeyboard).toHaveBeenCalledTimes(1);
            expect(mockStateMachine.onUserCloseEmoji).toHaveBeenCalledTimes(1);
        });

        it('should only call stateMachine.onUserCloseEmoji and NOT dismissKeyboard when isEmojiSearchFocused=false', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.closeInputAccessoryView();
            });

            expect(mockDismissKeyboard).not.toHaveBeenCalled();
            expect(mockStateMachine.onUserCloseEmoji).toHaveBeenCalledTimes(1);
        });
    });

    describe('blurAndDismissKeyboard', () => {
        it('should delegate to closeInputAccessoryView when showInputAccessoryView=true', async () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setShowInputAccessoryView(true);
            });

            mockDismissKeyboard.mockClear();
            mockStateMachine.onUserCloseEmoji.mockClear();

            // closeInputAccessoryView awaits a 250ms setTimeout internally — advance timers inside act
            const promise = result.current.blurAndDismissKeyboard();
            act(() => {
                jest.advanceTimersByTime(300);
            });
            await act(async () => {
                await promise;
            });

            // closeInputAccessoryView dispatches onUserCloseEmoji
            expect(mockStateMachine.onUserCloseEmoji).toHaveBeenCalledTimes(1);

            // dismissKeyboard is NOT called directly (closeInputAccessoryView handles it conditionally)
            expect(mockDismissKeyboard).not.toHaveBeenCalled();
        });

        it('should call dismissKeyboard when showInputAccessoryView=false', async () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            await act(async () => {
                await result.current.blurAndDismissKeyboard();
            });

            expect(mockDismissKeyboard).toHaveBeenCalledTimes(1);
        });
    });

    describe('registerPostInputCallbacks', () => {
        it('should make the updateValue callback available via context', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            const updateValueFn = jest.fn();
            const updateCursorPositionFn = jest.fn();

            act(() => {
                result.current.registerPostInputCallbacks(updateValueFn, updateCursorPositionFn);
            });

            expect(result.current.updateValue).toBe(updateValueFn);
        });

        it('should make the updateCursorPosition callback available via context', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            const updateValueFn = jest.fn();
            const updateCursorPositionFn = jest.fn();

            act(() => {
                result.current.registerPostInputCallbacks(updateValueFn, updateCursorPositionFn);
            });

            expect(result.current.updateCursorPosition).toBe(updateCursorPositionFn);
        });

        it('should initialize stateContext.cursorPosition.value to the current value length', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            const currentText = 'hello world'; // length = 11

            act(() => {
                result.current.registerPostInputCallbacks(jest.fn(), jest.fn(), currentText);
            });

            expect(mockStateContext.cursorPosition.value).toBe(currentText.length);
        });
    });

    describe('getCursorPosition', () => {
        it('should return the current value of stateContext.cursorPosition', () => {
            mockStateContext.cursorPosition.value = 42;

            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            expect(result.current.getCursorPosition()).toBe(42);
        });
    });

    describe('setCursorPosition', () => {
        it('should update stateContext.cursorPosition.value to the provided position', () => {
            const {result} = renderHook(() => useKeyboardState(), {wrapper: makeWrapper()});

            act(() => {
                result.current.setCursorPosition(99);
            });

            expect(mockStateContext.cursorPosition.value).toBe(99);
        });
    });
});

// ---------------------------------------------------------------------------
// useKeyboardState — used OUTSIDE provider (fallback values)
// ---------------------------------------------------------------------------

describe('useKeyboardState (outside provider)', () => {
    it('should return showInputAccessoryView=false', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.showInputAccessoryView).toBe(false);
    });

    it('should return isEmojiSearchFocused=false', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.isEmojiSearchFocused).toBe(false);
    });

    it('should return updateValue=null', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.updateValue).toBeNull();
    });

    it('should return updateCursorPosition=null', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.updateCursorPosition).toBeNull();
    });

    it('should return postInputContainerHeight=0', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.postInputContainerHeight).toBe(0);
    });

    it('should return a no-op setShowInputAccessoryView that does not throw', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(() => result.current.setShowInputAccessoryView(true)).not.toThrow();
    });

    it('should return a no-op setIsEmojiSearchFocused that does not throw', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(() => result.current.setIsEmojiSearchFocused(true)).not.toThrow();
    });

    it('should return getCursorPosition that always returns 0', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.getCursorPosition()).toBe(0);
    });

    it('should return a no-op setCursorPosition that does not throw', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(() => result.current.setCursorPosition(10)).not.toThrow();
    });

    it('should return a no-op async blurAndDismissKeyboard that resolves without error', async () => {
        const {result} = renderHook(() => useKeyboardState());
        await expect(result.current.blurAndDismissKeyboard()).resolves.toBeUndefined();
    });

    it('should return a no-op closeInputAccessoryView that does not throw', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(() => result.current.closeInputAccessoryView()).not.toThrow();
    });

    it('should return a no-op registerPostInputCallbacks that does not throw', () => {
        const {result} = renderHook(() => useKeyboardState());
        const noop = jest.fn();
        expect(() => result.current.registerPostInputCallbacks(noop, noop)).not.toThrow();
    });

    it('should return listRef with current=null', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.listRef.current).toBeNull();
    });

    it('should return inputRef with current=null', () => {
        const {result} = renderHook(() => useKeyboardState());
        expect(result.current.inputRef.current).toBeNull();
    });
});
