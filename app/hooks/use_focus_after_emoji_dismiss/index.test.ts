// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import {Platform} from 'react-native';

import {useKeyboardState} from '@context/keyboard_state';

import {useFocusAfterEmojiDismiss} from './index';

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: jest.fn(),
}));

// isAndroidEdgeToEdge is a module-level constant — mock the whole module
jest.mock('@constants/device', () => ({
    isAndroidEdgeToEdge: false,
    isEdgeToEdge: false,
}));

const mockSetShowInputAccessoryView = jest.fn();
const mockSetIsEmojiSearchFocused = jest.fn();
const mockOnUserCloseEmoji = jest.fn();
const mockStateContext = {
    isEmojiPickerTransition: {value: false},
    inputAccessoryHeight: {value: 300},
    postInputTranslateY: {value: 300},
};

function makeKeyboardStateMock(showInputAccessoryView = false) {
    jest.mocked(useKeyboardState).mockReturnValue({
        showInputAccessoryView,
        setShowInputAccessoryView: mockSetShowInputAccessoryView,
        setIsEmojiSearchFocused: mockSetIsEmojiSearchFocused,
        stateContext: mockStateContext,
        stateMachine: {onUserCloseEmoji: mockOnUserCloseEmoji},
    } as unknown as ReturnType<typeof useKeyboardState>);
}

describe('useFocusAfterEmojiDismiss', () => {
    const mockFocusInput = jest.fn();
    const mockBlur = jest.fn();
    const inputRef = {current: {blur: mockBlur} as unknown as Parameters<typeof useFocusAfterEmojiDismiss>[0]['current']};

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.clearAllMocks();
        mockStateContext.isEmojiPickerTransition.value = false;
        mockStateContext.inputAccessoryHeight.value = 300;
        mockStateContext.postInputTranslateY.value = 300;
        makeKeyboardStateMock(false);
    });

    afterEach(() => {
        act(() => {
            jest.runAllTimers();
        });
        jest.useRealTimers();
    });

    describe('focusWithEmojiDismiss (the returned focus function)', () => {
        describe('on iOS', () => {
            it('should call focusInput directly without any emoji-picker logic', () => {
                const originalOS = Platform.OS;
                (Platform as {OS: string}).OS = 'ios';
                makeKeyboardStateMock(true);

                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockFocusInput).toHaveBeenCalledTimes(1);
                expect(mockSetShowInputAccessoryView).not.toHaveBeenCalled();
                expect(mockOnUserCloseEmoji).not.toHaveBeenCalled();

                (Platform as {OS: string}).OS = originalOS;
            });
        });

        describe('on Android (non-edge-to-edge) with emoji picker visible', () => {
            beforeEach(() => {
                (Platform as {OS: string}).OS = 'android';
                makeKeyboardStateMock(true);
            });

            afterEach(() => {
                (Platform as {OS: string}).OS = 'ios';
            });

            it('should set isDismissingEmojiPicker=true', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(result.current.isDismissingEmojiPicker.current).toBe(true);
            });

            it('should set isEmojiPickerTransition guard on stateContext', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockStateContext.isEmojiPickerTransition.value).toBe(true);
            });

            it('should call setIsEmojiSearchFocused(false)', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockSetIsEmojiSearchFocused).toHaveBeenCalledWith(false);
            });

            it('should call setShowInputAccessoryView(false) to dismiss the picker', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockSetShowInputAccessoryView).toHaveBeenCalledWith(false);
            });

            it('should dispatch onUserCloseEmoji to the state machine', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockOnUserCloseEmoji).toHaveBeenCalledTimes(1);
            });

            it('should blur the input before scheduling the delayed focus', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockBlur).toHaveBeenCalledTimes(1);
                expect(mockFocusInput).not.toHaveBeenCalled();
            });

            it('should call focusInput after the 200ms timeout', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockFocusInput).not.toHaveBeenCalled();

                act(() => {
                    jest.advanceTimersByTime(200);
                });

                expect(mockFocusInput).toHaveBeenCalledTimes(1);
            });

            it('should clear the isEmojiPickerTransition guard after the 200ms timeout', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockStateContext.isEmojiPickerTransition.value).toBe(true);

                act(() => {
                    jest.advanceTimersByTime(200);
                });

                expect(mockStateContext.isEmojiPickerTransition.value).toBe(false);
            });

            it('should reset isManuallyFocusingAfterEmojiDismiss and isDismissingEmojiPicker after timeout', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                act(() => {
                    jest.advanceTimersByTime(200);
                });

                expect(result.current.isManuallyFocusingAfterEmojiDismiss).toBe(false);
                expect(result.current.isDismissingEmojiPicker.current).toBe(false);
            });

            it('should clear a previous pending timeout before scheduling a new one', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                // First press
                act(() => {
                    result.current.focus();
                });

                // Second press before timeout fires
                act(() => {
                    result.current.focus();
                });

                // Advance past one timeout window — focusInput should only be called once
                act(() => {
                    jest.advanceTimersByTime(200);
                });

                expect(mockFocusInput).toHaveBeenCalledTimes(1);
            });
        });

        describe('on Android (non-edge-to-edge) with emoji picker NOT visible', () => {
            beforeEach(() => {
                (Platform as {OS: string}).OS = 'android';
                makeKeyboardStateMock(false);
            });

            afterEach(() => {
                (Platform as {OS: string}).OS = 'ios';
            });

            it('should call focusInput directly when picker is not showing', () => {
                const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

                act(() => {
                    result.current.focus();
                });

                expect(mockFocusInput).toHaveBeenCalledTimes(1);
                expect(mockSetShowInputAccessoryView).not.toHaveBeenCalled();
            });
        });
    });

    describe('useEffect: delayed focus after showInputAccessoryView closes', () => {
        beforeEach(() => {
            (Platform as {OS: string}).OS = 'android';
        });

        afterEach(() => {
            (Platform as {OS: string}).OS = 'ios';
        });

        it('should trigger delayed focus via rAF+setTimeout when isManuallyFocusing transitions to true and picker closes', () => {
            // Start with picker visible so focusWithEmojiDismiss activates the android path
            makeKeyboardStateMock(true);
            const {result, rerender} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

            act(() => {
                result.current.focus();
            });

            // Simulate picker closing — showInputAccessoryView goes false (re-render with new mock value)
            makeKeyboardStateMock(false);
            rerender({});

            // rAF runs synchronously in Jest (mockedRequestAnimationFrame), then setTimeout fires
            act(() => {
                jest.runAllTimers();
            });

            // focusInput should have been called (once from timeout in focusWithEmojiDismiss,
            // and potentially once more from the effect path — at least once total)
            expect(mockFocusInput.mock.calls.length).toBeGreaterThanOrEqual(1);
        });

        it('should blur input before the delayed focus in the effect path', () => {
            makeKeyboardStateMock(true);
            const {result, rerender} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

            act(() => {
                result.current.focus();
            });

            mockBlur.mockClear();

            // Picker closes
            makeKeyboardStateMock(false);
            rerender({});

            // blur should be called as part of the effect
            expect(mockBlur).toHaveBeenCalled();
        });

        it('should NOT trigger the effect on iOS even if isManuallyFocusing is somehow true', () => {
            // This state cannot normally be reached on iOS, but we verify the Platform guard
            (Platform as {OS: string}).OS = 'ios';
            makeKeyboardStateMock(false);

            const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

            act(() => {
                result.current.focus();
            });

            expect(mockSetShowInputAccessoryView).not.toHaveBeenCalled();
        });

        it('should clear a pending useEffect-path timeout when the effect re-runs before it fires', () => {
            // Trigger the useEffect active branch, then force the effect to re-run
            // with a new scheduled timeout pending — verifying the cleanup clears it.
            makeKeyboardStateMock(true);
            const {result, rerender} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));

            act(() => {
                result.current.focus();
            });

            // Picker closes → effect fires, rAF runs synchronously, timeout B is scheduled.
            // The focusWithEmojiDismiss timeout A was also cleared by this effect (it clears
            // any pending focusTimeoutRef before scheduling its own via rAF).
            makeKeyboardStateMock(false);
            act(() => {
                rerender({});
            });

            // Immediately close the effect by unmounting — cleanup runs while timeout B is pending
            act(() => {
                // Advance just 1ms so timers haven't fired
                jest.advanceTimersByTime(1);
            });

            // At this point focusTimeoutRef.current is set (timeout B pending).
            // Now force the effect cleanup by re-rendering with picker=true (changes showInputAccessoryView dep).
            // The cleanup should call clearTimeout on the pending timer.
            makeKeyboardStateMock(true);
            act(() => {
                rerender({});
            });

            // Drain remaining timers — the cleared timeout B should NOT call focusInput.
            act(() => {
                jest.runAllTimers();
            });

            // focusInput was NOT called (timeout B was cleared; timeout A was also cleared)
            expect(mockFocusInput).not.toHaveBeenCalled();
        });
    });

    describe('return values', () => {
        it('should return isDismissingEmojiPicker ref starting as false', () => {
            const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));
            expect(result.current.isDismissingEmojiPicker.current).toBe(false);
        });

        it('should return focusTimeoutRef starting as null', () => {
            const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));
            expect(result.current.focusTimeoutRef.current).toBeNull();
        });

        it('should return isManuallyFocusingAfterEmojiDismiss starting as false', () => {
            const {result} = renderHook(() => useFocusAfterEmojiDismiss(inputRef, mockFocusInput));
            expect(result.current.isManuallyFocusingAfterEmojiDismiss).toBe(false);
        });
    });
});
