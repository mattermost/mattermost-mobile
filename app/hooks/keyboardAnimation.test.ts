// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {useKeyboardHandler} from 'react-native-keyboard-controller';

import {BOTTOM_TAB_HEIGHT} from '@constants/view';

import {useKeyboardAnimation} from './keyboardAnimation';

jest.mock('react-native-keyboard-controller', () => ({
    useKeyboardHandler: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
    const sharedValues = new Map();

    return {
        ...jest.requireActual('react-native-reanimated/mock'),
        useSharedValue: jest.fn((initial) => {
            const key = Math.random();
            const sv = {
                value: initial,
                _key: key,
            };
            sharedValues.set(key, sv);
            return sv;
        }),
        useDerivedValue: jest.fn((fn) => ({
            value: fn(),
        })),
        useAnimatedScrollHandler: jest.fn((handlers) => (event: {contentOffset: {y: number}}) => {
            if (handlers.onScroll) {
                handlers.onScroll(event);
            }
        }),
    };
});

describe('useKeyboardAnimation', () => {
    const mockUseKeyboardHandler = useKeyboardHandler as jest.Mock;
    let keyboardHandlerCallbacks: {
        onStart?: (e: {height: number; progress: number}) => void;
        onInteractive?: (e: {height: number; progress: number}) => void;
        onMove?: (e: {height: number; progress: number}) => void;
        onEnd?: (e: {height: number; progress: number}) => void;
    } = {};

    beforeEach(() => {
        jest.clearAllMocks();
        keyboardHandlerCallbacks = {};
        mockUseKeyboardHandler.mockImplementation((callbacks) => {
            keyboardHandlerCallbacks = callbacks;
        });
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            expect(result.current.keyboardTranslateY.value).toBe(0);
            expect(result.current.bottomInset.value).toBe(0);
            expect(result.current.scrollOffset.value).toBe(0);
            expect(result.current.scrollPosition.value).toBe(0);
            expect(result.current.keyboardHeight.value).toBe(0);
            expect(result.current.isKeyboardFullyOpen.value).toBe(false);
            expect(result.current.isKeyboardFullyClosed.value).toBe(true);
            expect(result.current.isKeyboardInTransition.value).toBe(false);
            expect(result.current.onScroll).toBeDefined();
        });

        it('should call useKeyboardHandler with callbacks', () => {
            renderHook(() => useKeyboardAnimation(100, true, false, 0, false, true));

            expect(mockUseKeyboardHandler).toHaveBeenCalled();
            expect(keyboardHandlerCallbacks.onStart).toBeDefined();
            expect(keyboardHandlerCallbacks.onInteractive).toBeDefined();
            expect(keyboardHandlerCallbacks.onMove).toBeDefined();
            expect(keyboardHandlerCallbacks.onEnd).toBeDefined();
        });
    });

    describe('enabled prop', () => {
        it('should skip processing when enabled is false', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, false),
            );

            const initialHeight = result.current.keyboardTranslateY.value;

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(initialHeight);
        });

        it('should process events when enabled is true', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(300);
        });
    });

    describe('enableAnimation prop', () => {
        it('should skip processing when enableAnimation is false', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, false, false, 0, false, true),
            );

            const initialHeight = result.current.keyboardTranslateY.value;

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(initialHeight);
        });
    });

    describe('onStart callback', () => {
        it('should update keyboard height and state on start', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.keyboardHeight.value).toBe(300);
            expect(result.current.keyboardTranslateY.value).toBe(300);
            expect(result.current.bottomInset.value).toBe(300);

            // isKeyboardFullyOpen is set to false in onStart to prevent jerky behavior
            // It will be set to true in onEnd when animation completes
            expect(result.current.isKeyboardFullyOpen.value).toBe(false);
            expect(result.current.isKeyboardFullyClosed.value).toBe(false);
            expect(result.current.isKeyboardInTransition.value).toBe(false);

            // Call onEnd to finalize the state
            act(() => {
                keyboardHandlerCallbacks.onEnd?.({
                    height: 300,
                    progress: 1,
                });
            });

            // After onEnd, keyboard should be marked as fully open
            expect(result.current.isKeyboardFullyOpen.value).toBe(true);
            expect(result.current.isKeyboardFullyClosed.value).toBe(false);
            expect(result.current.isKeyboardInTransition.value).toBe(false);
        });

        it('should handle partial progress on start', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 150,
                    progress: 0.5,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(150);
            expect(result.current.isKeyboardFullyOpen.value).toBe(false);
            expect(result.current.isKeyboardInTransition.value).toBe(true);
        });

        it('should ignore adjustment events from KeyboardGestureArea', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            // Set initial keyboard height
            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            const initialHeight = result.current.keyboardTranslateY.value;

            // Try to trigger adjustment event (height = keyboardHeight - postInputContainerHeight)
            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 200, // 300 - 100
                    progress: 1,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(initialHeight);
        });
    });

    describe('onInteractive callback', () => {
        it('should update values during interactive drag', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            // First call onStart to set initial height (required for onInteractive to work)
            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            // Then call onInteractive to simulate interactive drag
            act(() => {
                keyboardHandlerCallbacks.onInteractive?.({
                    height: 250,
                    progress: 0.8,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(250);
            expect(result.current.scrollOffset.value).toBe(250);
            expect(result.current.bottomInset.value).toBe(250);
        });

        it('should track keyboard closing state', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            // Set initial height
            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            // Simulate closing (height decreasing)
            act(() => {
                keyboardHandlerCallbacks.onInteractive?.({
                    height: 200,
                    progress: 0.7,
                });
            });

            // isKeyboardClosing is internal state, not exposed in return value
            // We verify closing behavior by checking that height decreases
            expect(result.current.keyboardTranslateY.value).toBeLessThan(300);
        });

        it('should ignore events matching postInputContainerHeight', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            const initialHeight = result.current.keyboardTranslateY.value;

            act(() => {
                keyboardHandlerCallbacks.onInteractive?.({
                    height: 100, // matches postInputContainerHeight
                    progress: 0.5,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(initialHeight);
        });
    });

    describe('onMove callback', () => {
        it('should update values during keyboard movement', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 250,
                    progress: 0.7,
                });
            });

            act(() => {
                keyboardHandlerCallbacks.onMove?.({
                    height: 280,
                    progress: 0.9,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(280);
            expect(result.current.scrollOffset.value).toBe(280);
            expect(result.current.bottomInset.value).toBe(280);
        });

        it('should ignore onMove events when keyboard is closing', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            act(() => {
                keyboardHandlerCallbacks.onInteractive?.({
                    height: 200,
                    progress: 0.7,
                });
            });

            act(() => {
                keyboardHandlerCallbacks.onMove?.({
                    height: 150,
                    progress: 0.5,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(200);
            expect(result.current.scrollOffset.value).toBe(200);
            expect(result.current.bottomInset.value).toBe(200);
        });

        it('should handle negative heights from programmatic dismiss', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onMove?.({
                    height: -50, // negative height from KeyboardController.dismiss()
                    progress: 0,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(50); // Math.abs applied
        });
    });

    describe('onEnd callback', () => {
        it('should finalize state when keyboard fully opens', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            act(() => {
                keyboardHandlerCallbacks.onEnd?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.isKeyboardFullyOpen.value).toBe(true);
            expect(result.current.isKeyboardFullyClosed.value).toBe(false);
            expect(result.current.isKeyboardInTransition.value).toBe(false);
        });

        it('should finalize state when keyboard fully closes', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 0,
                    progress: 0,
                });
            });

            act(() => {
                keyboardHandlerCallbacks.onEnd?.({
                    height: 0,
                    progress: 0,
                });
            });

            expect(result.current.isKeyboardFullyOpen.value).toBe(false);
            expect(result.current.isKeyboardFullyClosed.value).toBe(true);
            expect(result.current.isKeyboardInTransition.value).toBe(false);
            expect(result.current.keyboardTranslateY.value).toBe(0);
        });
    });

    describe('tablet and tab bar adjustment', () => {
        it('should apply tab bar adjustment for tablets in non-thread view', () => {
            const safeAreaBottom = 20;
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, true, safeAreaBottom, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            const expectedAdjustment = BOTTOM_TAB_HEIGHT + safeAreaBottom;
            expect(result.current.keyboardTranslateY.value).toBe(300 - expectedAdjustment);
        });

        it('should apply safeAreaBottom adjustment for thread view', () => {
            const safeAreaBottom = 20;
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, true, safeAreaBottom, true, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(300 - safeAreaBottom);
        });

        it('should apply safeAreaBottom adjustment for mobile', () => {
            const safeAreaBottom = 20;
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, safeAreaBottom, false, true),
            );

            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 300,
                    progress: 1,
                });
            });

            expect(result.current.keyboardTranslateY.value).toBe(300 - safeAreaBottom);
        });
    });

    describe('scroll handler', () => {
        it('should track scroll position with bottomInset', () => {
            const {result} = renderHook(() =>
                useKeyboardAnimation(100, true, false, 0, false, true),
            );

            // Set bottomInset first
            act(() => {
                keyboardHandlerCallbacks.onStart?.({
                    height: 200,
                    progress: 1,
                });
            });

            const mockScrollEvent = {
                contentOffset: {y: 100},
            } as unknown as Parameters<typeof result.current.onScroll>[0];

            act(() => {
                result.current.onScroll(mockScrollEvent);
            });

            expect(result.current.scrollPosition.value).toBe(100 + result.current.bottomInset.value);
        });
    });
});

