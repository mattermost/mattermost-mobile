// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {useSharedValue} from 'react-native-reanimated';

import {useGallery} from '@context/gallery';

import {useGalleryControls, useGalleryItem, diff, useCreateAnimatedGestureHandler} from './gallery';

jest.mock('react-native-reanimated', () => ({
    Easing: {
        bezier: jest.fn(),
    },
    runOnJS: jest.fn((fn) => fn),
    useAnimatedRef: jest.fn(() => ({})),
    useAnimatedStyle: jest.fn((fn) => fn()),
    useEvent: jest.fn(),
    useSharedValue: jest.fn(),
    withTiming: jest.fn(),
}));

jest.mock('@context/gallery', () => ({
    useGallery: jest.fn(),
}));

jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
    },
}));

describe('gallery hooks', () => {
    test('diff', () => {
        const context = {} as {___diffs?: any};
        const name = 'test';
        const value = 10;

        const result = diff(context, name, value);

        expect(result).toBe(0);
        expect(context.___diffs[name].stash).toBe(0);
        expect(context.___diffs[name].prev).toBe(value);
    });

    test('diff should return 0 for the same value', () => {
        const context = {} as {___diffs?: any};
        const name = 'test';
        const value = 10;

        diff(context, name, value);
        const result = diff(context, name, value);

        expect(result).toBe(0);
        expect(context.___diffs[name].stash).toBe(0);
        expect(context.___diffs[name].prev).toBe(value);
    });

    describe('useCreateAnimatedGestureHandler', () => {
        const handlers = {
            onInit: jest.fn(),
            onGesture: jest.fn(),
            shouldHandleEvent: jest.fn(),
            onEvent: jest.fn(),
            shouldCancel: jest.fn(),
            onEnd: jest.fn(),
            onStart: jest.fn(),
            onActive: jest.fn(),
            onFail: jest.fn(),
            onCancel: jest.fn(),
            onFinish: jest.fn(),
            beforeEach: jest.fn(),
            afterEach: jest.fn(),
        };

        test('iOS and state is active', () => {
            const context = {__initialized: false, _shouldSkip: false} as any;

            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            expect(handler).toBeInstanceOf(Function);

            const event = {
                nativeEvent: {
                    state: 4,
                    oldState: 1,
                    velocityX: 0,
                    velocityY: 0,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.onInit).toHaveBeenCalled();
            expect(handlers.onGesture).toHaveBeenCalled();
            expect(handlers.shouldHandleEvent).not.toHaveBeenCalled();
            expect(handlers.onEvent).toHaveBeenCalled();
            expect(handlers.shouldCancel).toHaveBeenCalled();
            expect(handlers.onEnd).not.toHaveBeenCalled();
            expect(handlers.onStart).not.toHaveBeenCalled();
            expect(handlers.onActive).toHaveBeenCalled();
            expect(handlers.onFail).not.toHaveBeenCalled();
            expect(handlers.onCancel).not.toHaveBeenCalled();
            expect(handlers.onFinish).not.toHaveBeenCalled();
            expect(handlers.beforeEach).toHaveBeenCalled();
            expect(handlers.afterEach).toHaveBeenCalled();

            // Check the expected values of context
            expect(context.__initialized).toBe(true);
            expect(context._shouldSkip).toBe(false);
        });

        test('State is end, oldState is active', () => {
            const context = {__initialized: false, _shouldSkip: false} as any;

            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            expect(handler).toBeInstanceOf(Function);

            const event = {
                nativeEvent: {
                    state: 5,
                    oldState: 4,
                    velocityX: 0,
                    velocityY: 0,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.onEnd).toHaveBeenCalled();

            // Check the expected values of context
            expect(context.__initialized).toBe(true);
            expect(context._shouldCancel).toBeUndefined();
            expect(context._shouldSkip).toBeUndefined();
        });

        test('State is began, oldState is active, velocity non-zero', () => {
            const context = {__initialized: false, _shouldSkip: false} as any;

            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            expect(handler).toBeInstanceOf(Function);

            const event = {
                nativeEvent: {
                    state: 2,
                    oldState: 4,
                    velocityX: 1,
                    velocityY: 1,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.shouldHandleEvent).toHaveBeenCalled();

            // Check the expected values of context
            expect(context.__initialized).toBe(true);
            expect(context._shouldCancel).toBeUndefined();
            expect(context._shouldSkip).toBeUndefined();
        });

        test('should skip handling event if shouldHandleEvent returns false', () => {
            const context = {__initialized: false, _shouldSkip: undefined} as any;

            handlers.shouldHandleEvent.mockReturnValueOnce(false);
            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;
            expect(handler).toBeInstanceOf(Function);

            const event = {
                nativeEvent: {
                    state: 2,
                    velocityX: 1,
                    velocityY: 1,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.shouldHandleEvent).toHaveBeenCalled();
            expect(context._shouldSkip).toBe(true);
        });

        test('handles shouldCancel returning true', () => {
            const context = {__initialized: true, _shouldSkip: false} as any;
            handlers.shouldCancel.mockReturnValueOnce(true);
            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            const event = {
                nativeEvent: {
                    state: 4, // ACTIVE
                    oldState: 2, // BEGAN
                    velocityX: 0,
                    velocityY: 0,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.shouldCancel).toHaveBeenCalled();
            expect(handlers.onEnd).toHaveBeenCalledWith(
                event.nativeEvent,
                context,
                true, // cancelled = true
            );
            expect(handlers.onActive).not.toHaveBeenCalled();
        });

        test('skips event handling when context._shouldSkip is undefined', () => {
            const context = {__initialized: true} as any;
            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            const event = {
                nativeEvent: {
                    state: 4, // ACTIVE
                    oldState: 3, // CANCELLED
                    velocityX: 0,
                    velocityY: 0,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.onEvent).not.toHaveBeenCalled();
            expect(handlers.onActive).not.toHaveBeenCalled();
        });

        test('handles CANCELLED state when oldState is ACTIVE', () => {
            const context = {__initialized: true, _shouldSkip: false} as any;
            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            const event = {
                nativeEvent: {
                    state: 3, // CANCELLED
                    oldState: 4, // ACTIVE
                    velocityX: 0,
                    velocityY: 0,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.onCancel).toHaveBeenCalled();
            expect(handlers.onFinish).toHaveBeenCalledWith(
                event.nativeEvent,
                context,
                true, // cancelled = true
            );
        });

        test('handles FAILED state when oldState is ACTIVE', () => {
            const context = {__initialized: true, _shouldSkip: false} as any;
            (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: context}));

            const {result} = renderHook(() => useCreateAnimatedGestureHandler(handlers));
            const handler = result.current;

            const event = {
                nativeEvent: {
                    state: 1, // FAILED
                    oldState: 4, // ACTIVE
                    velocityX: 0,
                    velocityY: 0,
                },
            };

            act(() => {
                handler(event.nativeEvent as any);
            });

            expect(handlers.onFail).toHaveBeenCalled();
            expect(handlers.onFinish).toHaveBeenCalledWith(
                event.nativeEvent,
                context,
                true, // failed = true
            );
        });
    });

    test('useGalleryControls', () => {
        (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: false}));
        const {result} = renderHook(() => useGalleryControls());

        act(() => {
            result.current.setControlsHidden(true);
        });

        expect(result.current.controlsHidden.value).toBe(true);

        act(() => {
            result.current.setControlsHidden(false);
        });

        expect(result.current.controlsHidden.value).toBe(false);
    });

    test('useGalleryControls does not update controlsHidden when same value is set', () => {
        const mockWithTiming = jest.fn();
        (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: true}));

        const {result} = renderHook(() => useGalleryControls());

        act(() => {
            result.current.setControlsHidden(true);
        });

        expect(mockWithTiming).not.toHaveBeenCalled();
    });

    test('useGalleryItem', () => {
        const identifier = 'test';
        const index = 0;
        const onPress = jest.fn();
        const gallery = {
            sharedValues: {
                opacity: {value: 1},
                activeIndex: {value: 0},
            },
            registerItem: jest.fn(),
        };
        (useGallery as jest.Mock).mockReturnValue(gallery);

        const {result} = renderHook(() => useGalleryItem(identifier, index, onPress));

        expect(result.current.ref).toBeDefined();
        expect(result.current.styles).toBeDefined();
        expect(result.current.onGestureEvent).toBeInstanceOf(Function);

        act(() => {
            result.current.onGestureEvent();
        });

        expect(gallery.sharedValues.activeIndex.value).toBe(index);
        expect(onPress).toHaveBeenCalledWith(identifier, index);
    });

    test('useGalleryItem updates activeIndex when onGestureEvent is triggered', () => {
        const identifier = 'test';
        const index = 0;
        const onPress = jest.fn();
        const gallery = {
            sharedValues: {
                opacity: {value: 1},
                activeIndex: {value: 1}, // Initial value different from index
            },
            registerItem: jest.fn(),
        };
        (useGallery as jest.Mock).mockReturnValue(gallery);

        const {result} = renderHook(() => useGalleryItem(identifier, index, onPress));

        expect(result.current.styles.opacity).toBe(1);

        act(() => {
            result.current.onGestureEvent();
        });

        expect(gallery.sharedValues.activeIndex.value).toBe(index);
        expect(onPress).toHaveBeenCalledWith(identifier, index);
    });
});
