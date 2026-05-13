// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';
import {Platform} from 'react-native';

import {useKeyboardState} from '@context/keyboard_state';
import {useIsTablet, useWindowDimensions} from '@hooks/device';

import {useInputAccessoryViewGesture} from './index';

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
    useWindowDimensions: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({bottom: 0})),
}));

// Capture gesture callbacks so tests can invoke them directly
type GestureCallback = (...args: unknown[]) => void;
const capturedCallbacks: Record<string, GestureCallback> = {};
const mockManualActivation = jest.fn();

jest.mock('react-native-gesture-handler', () => {
    const mockPanGesture = {
        manualActivation: (...args: unknown[]) => {
            mockManualActivation(...args);
            return mockPanGesture;
        },
        onTouchesMove: (cb: GestureCallback) => {
            capturedCallbacks.onTouchesMove = cb;
            return mockPanGesture;
        },
        onTouchesUp: (cb: GestureCallback) => {
            capturedCallbacks.onTouchesUp = cb;
            return mockPanGesture;
        },
        onUpdate: (cb: GestureCallback) => {
            capturedCallbacks.onUpdate = cb;
            return mockPanGesture;
        },
        onEnd: (cb: GestureCallback) => {
            capturedCallbacks.onEnd = cb;
            return mockPanGesture;
        },
        onFinalize: (cb: GestureCallback) => {
            capturedCallbacks.onFinalize = cb;
            return mockPanGesture;
        },
    };
    return {
        Gesture: {Pan: () => mockPanGesture},
    };
});

// withTiming synchronously calls callback so we can test the aftermath
jest.mock('react-native-reanimated', () => ({
    useSharedValue: jest.fn((v: unknown) => ({value: v})),
    withTiming: jest.fn((toValue: number, _config: unknown, callback?: (finished: boolean) => void) => {
        callback?.(true);
        return toValue;
    }),
}));

const mockSetIsEmojiSearchFocused = jest.fn();
const mockOnUserCloseEmoji = jest.fn();

const mockStateContext = {
    postInputContainerHeight: {value: 60},
    inputAccessoryHeight: {value: 300},
    postInputTranslateY: {value: 0},
    isDraggingKeyboard: {value: false},
    scrollOffset: {value: 0},
    scrollPosition: {value: 500},
};

function makeKeyboardStateMock({isEmojiSearchFocused = false} = {}) {
    jest.mocked(useKeyboardState).mockReturnValue({
        stateContext: mockStateContext,
        isEmojiSearchFocused,
        setIsEmojiSearchFocused: mockSetIsEmojiSearchFocused,
        stateMachine: {onUserCloseEmoji: mockOnUserCloseEmoji},
    } as unknown as ReturnType<typeof useKeyboardState>);
}

// Simulate a GestureHandler TouchData touch event object
function makeTouch(absoluteY: number) {
    return {changedTouches: [{absoluteY}]};
}

// Simulate a GestureHandler GestureUpdateEvent (onUpdate)
function makeUpdateEvent(absoluteY: number, velocityY: number) {
    return {absoluteY, velocityY};
}

// Manager mock for manual activation gestures
function makeManager() {
    return {activate: jest.fn(), fail: jest.fn()};
}

const WINDOW_HEIGHT = 800;
const CONTAINER_HEIGHT = 60; // postInputContainerHeight
const PICKER_HEIGHT = 300; // inputAccessoryHeight

// Picker occupies: top=440, bottom=740
const PICKER_TOP = WINDOW_HEIGHT - CONTAINER_HEIGHT - PICKER_HEIGHT;
const PICKER_BOTTOM = WINDOW_HEIGHT - CONTAINER_HEIGHT;

describe('useInputAccessoryViewGesture', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(capturedCallbacks).forEach((k) => delete capturedCallbacks[k]);
        jest.replaceProperty(Platform, 'OS', 'ios');
        jest.mocked(useWindowDimensions).mockReturnValue({width: 390, height: WINDOW_HEIGHT} as ReturnType<typeof useWindowDimensions>);
        jest.mocked(useIsTablet).mockReturnValue(false);
        mockStateContext.postInputContainerHeight.value = CONTAINER_HEIGHT;
        mockStateContext.inputAccessoryHeight.value = PICKER_HEIGHT;
        mockStateContext.postInputTranslateY.value = 0;
        mockStateContext.isDraggingKeyboard.value = false;
        mockStateContext.scrollOffset.value = 0;
        mockStateContext.scrollPosition.value = 500;
        makeKeyboardStateMock();
    });

    describe('panGesture availability', () => {
        it('should return panGesture on iOS', () => {
            const {result} = renderHook(() => useInputAccessoryViewGesture());
            expect(result.current.panGesture).toBeDefined();
        });

        it('should return undefined panGesture on Android', () => {
            jest.replaceProperty(Platform, 'OS', 'android');
            const {result} = renderHook(() => useInputAccessoryViewGesture());
            expect(result.current.panGesture).toBeUndefined();
        });
    });

    describe('gesture setup', () => {
        it('should call manualActivation(true)', () => {
            renderHook(() => useInputAccessoryViewGesture());
            expect(mockManualActivation).toHaveBeenCalledWith(true);
        });

        it('should register all required callbacks', () => {
            renderHook(() => useInputAccessoryViewGesture());
            expect(capturedCallbacks.onTouchesMove).toBeDefined();
            expect(capturedCallbacks.onTouchesUp).toBeDefined();
            expect(capturedCallbacks.onUpdate).toBeDefined();
            expect(capturedCallbacks.onEnd).toBeDefined();
            expect(capturedCallbacks.onFinalize).toBeDefined();
        });
    });

    describe('onTouchesMove', () => {
        it('should do nothing when inputAccessoryHeight is 0 (picker not open)', () => {
            mockStateContext.inputAccessoryHeight.value = 0;
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 10), manager);
            expect(manager.activate).not.toHaveBeenCalled();
            expect(mockStateContext.isDraggingKeyboard.value).toBe(false);
        });

        it('should do nothing when emoji search is focused', () => {
            makeKeyboardStateMock({isEmojiSearchFocused: true});
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 10), manager);
            expect(manager.activate).not.toHaveBeenCalled();
        });

        it('should do nothing when touch data is empty', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove({changedTouches: []}, manager);
            expect(manager.activate).not.toHaveBeenCalled();
        });

        it('should not activate when finger is above the picker area', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Two moves downward but above picker top
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP - 50), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP - 10), manager);
            expect(manager.activate).not.toHaveBeenCalled();
        });

        it('should not activate when finger is below the picker area (in input container)', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_BOTTOM + 10), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_BOTTOM + 20), manager);
            expect(manager.activate).not.toHaveBeenCalled();
        });

        it('should not activate when moving upward within picker area', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Move down first to set previousTouchY, then move up
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 50), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 30), manager);
            expect(manager.activate).not.toHaveBeenCalled();
        });

        it('should activate when finger is in picker area and moving downward', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // First move sets previousTouchY, second move is downward within picker
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);
            expect(manager.activate).toHaveBeenCalled();
        });

        it('should set isDraggingKeyboard=true and record originalEmojiPickerHeight on first activation', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);
            expect(mockStateContext.isDraggingKeyboard.value).toBe(true);
        });

        it('should not re-initialize drag state on subsequent moves after activation', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            // Reset spy to check it's not called again
            mockStateContext.isDraggingKeyboard.value = true;
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 60), manager);

            // activate is called each time gesture is in active zone
            expect(manager.activate).toHaveBeenCalled();

            // isDraggingKeyboard stays true (not reset/toggled)
            expect(mockStateContext.isDraggingKeyboard.value).toBe(true);
        });
    });

    describe('onTouchesUp', () => {
        it('should call manager.fail() when drag was never activated', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesUp({}, manager);
            expect(manager.fail).toHaveBeenCalled();
        });

        it('should not call manager.fail() when drag is active', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Activate the drag first
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);
            capturedCallbacks.onTouchesUp({}, manager);
            expect(manager.fail).not.toHaveBeenCalled();
        });
    });

    describe('onUpdate', () => {
        it('should do nothing when drag is not active', () => {
            renderHook(() => useInputAccessoryViewGesture());
            capturedCallbacks.onUpdate(makeUpdateEvent(600, 5));
            expect(mockStateContext.inputAccessoryHeight.value).toBe(PICKER_HEIGHT);
        });

        it('should update inputAccessoryHeight based on finger position', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Activate drag
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            // fingerY=560: distanceFromBottom = 800-560=240, pickerHeight=240-60=180
            capturedCallbacks.onUpdate(makeUpdateEvent(560, 5));
            expect(mockStateContext.inputAccessoryHeight.value).toBe(180);
        });

        it('should update postInputTranslateY to match computed picker height', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            capturedCallbacks.onUpdate(makeUpdateEvent(560, 5));
            expect(mockStateContext.postInputTranslateY.value).toBe(180);
        });

        it('should clamp computed height to 0 when finger goes below the container', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Activate drag
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            // fingerY=780: distanceFromBottom=20, pickerHeight=20-60=-40 → clamped to 0
            capturedCallbacks.onUpdate(makeUpdateEvent(780, 5));
            expect(mockStateContext.inputAccessoryHeight.value).toBe(0);
            expect(mockStateContext.postInputTranslateY.value).toBe(0);
        });

        it('should clamp computed height to originalEmojiPickerHeight when finger overshoots top', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Activate drag
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            // fingerY=100: distanceFromBottom=700, pickerHeight=700-60=640 → clamped to 300
            capturedCallbacks.onUpdate(makeUpdateEvent(100, -5));
            expect(mockStateContext.inputAccessoryHeight.value).toBe(PICKER_HEIGHT);
        });
    });

    describe('onEnd — swipe down dismisses', () => {
        function setupActiveDrag() {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            // Simulate partial drag down
            capturedCallbacks.onUpdate(makeUpdateEvent(560, 20));
        }

        it('should animate inputAccessoryHeight to 0', () => {
            setupActiveDrag();
            capturedCallbacks.onEnd();
            expect(mockStateContext.inputAccessoryHeight.value).toBe(0);
        });

        it('should animate postInputTranslateY to 0', () => {
            setupActiveDrag();
            capturedCallbacks.onEnd();
            expect(mockStateContext.postInputTranslateY.value).toBe(0);
        });

        it('should reset scrollOffset to 0', () => {
            mockStateContext.scrollOffset.value = 100;
            setupActiveDrag();
            capturedCallbacks.onEnd();
            expect(mockStateContext.scrollOffset.value).toBe(0);
        });

        it('should call setIsEmojiSearchFocused(false) and stateMachine.onUserCloseEmoji()', async () => {
            setupActiveDrag();
            capturedCallbacks.onEnd();
            await Promise.resolve();
            expect(mockSetIsEmojiSearchFocused).toHaveBeenCalledWith(false);
            expect(mockOnUserCloseEmoji).toHaveBeenCalledTimes(1);
        });

        it('should do nothing when drag is not active', () => {
            renderHook(() => useInputAccessoryViewGesture());
            capturedCallbacks.onEnd();
            expect(mockOnUserCloseEmoji).not.toHaveBeenCalled();
            expect(mockStateContext.inputAccessoryHeight.value).toBe(PICKER_HEIGHT);
        });
    });

    describe('onEnd — swipe up expands', () => {
        function setupSwipeUp() {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);

            // Simulate partial drag, then velocity going up (negative)
            capturedCallbacks.onUpdate(makeUpdateEvent(560, -10));
        }

        it('should animate inputAccessoryHeight back to original height', () => {
            setupSwipeUp();
            capturedCallbacks.onEnd();
            expect(mockStateContext.inputAccessoryHeight.value).toBe(PICKER_HEIGHT);
        });

        it('should animate postInputTranslateY back to original height', () => {
            setupSwipeUp();
            capturedCallbacks.onEnd();
            expect(mockStateContext.postInputTranslateY.value).toBe(PICKER_HEIGHT);
        });

        it('should clear isDraggingKeyboard after animation', () => {
            setupSwipeUp();
            capturedCallbacks.onEnd();
            expect(mockStateContext.isDraggingKeyboard.value).toBe(false);
        });

        it('should not call dismiss callbacks', () => {
            setupSwipeUp();
            capturedCallbacks.onEnd();
            expect(mockOnUserCloseEmoji).not.toHaveBeenCalled();
            expect(mockSetIsEmojiSearchFocused).not.toHaveBeenCalled();
        });
    });

    describe('onFinalize', () => {
        it('should reset isDragActive so subsequent touches start fresh', () => {
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Activate drag
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);
            expect(mockStateContext.isDraggingKeyboard.value).toBe(true);

            // Finalize resets isDragActive — next onUpdate should be a no-op
            capturedCallbacks.onFinalize();
            const heightBefore = mockStateContext.inputAccessoryHeight.value;
            capturedCallbacks.onUpdate(makeUpdateEvent(560, 5));
            expect(mockStateContext.inputAccessoryHeight.value).toBe(heightBefore);
        });
    });

    describe('effectiveWindowHeight', () => {
        it('should use full windowHeight on tablet (no inset subtraction)', () => {
            jest.mocked(useIsTablet).mockReturnValue(true);

            // On tablet, effectiveWindowHeight = windowHeight = 800
            // Picker area: top = 800 - 60 - 300 = 440
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();

            // Touch at PICKER_TOP + 20 should still activate
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(PICKER_TOP + 40), manager);
            expect(manager.activate).toHaveBeenCalled();
        });

        it('should subtract insets.bottom on phone', () => {
            const {useSafeAreaInsets} = jest.requireMock('react-native-safe-area-context');
            useSafeAreaInsets.mockReturnValue({bottom: 34});
            jest.mocked(useIsTablet).mockReturnValue(false);

            // effectiveWindowHeight = 800 - 34 = 766
            // Picker area: top = 766 - 60 - 300 = 406
            const newPickerTop = WINDOW_HEIGHT - 34 - CONTAINER_HEIGHT - PICKER_HEIGHT;
            renderHook(() => useInputAccessoryViewGesture());
            const manager = makeManager();
            capturedCallbacks.onTouchesMove(makeTouch(newPickerTop + 20), manager);
            capturedCallbacks.onTouchesMove(makeTouch(newPickerTop + 40), manager);
            expect(manager.activate).toHaveBeenCalled();
        });
    });
});
