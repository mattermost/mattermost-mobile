// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {Platform} from 'react-native';

import {useScreenTransitionAnimation} from './screen_transition_animation';

const mockUseFocusEffect = jest.fn();
const mockUseReducedMotion = jest.fn();
const mockUseSharedValue = jest.fn();
const mockUseAnimatedStyle = jest.fn();
const mockWithTiming = jest.fn();
const mockUseWindowDimensions = jest.fn();

jest.mock('expo-router', () => ({
    useFocusEffect: (callback: () => void) => mockUseFocusEffect(callback),
}));

jest.mock('react-native-reanimated', () => ({
    useReducedMotion: () => mockUseReducedMotion(),
    useSharedValue: (value: number) => mockUseSharedValue(value),
    useAnimatedStyle: (callback: () => any) => mockUseAnimatedStyle(callback),
    withTiming: (value: number, config: any) => mockWithTiming(value, config),
}));

jest.mock('./device', () => ({
    useWindowDimensions: () => mockUseWindowDimensions(),
}));

describe('useScreenTransitionAnimation', () => {
    let sharedValue: {value: number};

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementations
        sharedValue = {value: 0};
        mockUseSharedValue.mockReturnValue(sharedValue);
        mockUseAnimatedStyle.mockImplementation((callback) => {
            const style = callback();
            return style;
        });
        mockWithTiming.mockImplementation((value) => value);
        mockUseReducedMotion.mockReturnValue(false);
        mockUseWindowDimensions.mockReturnValue({width: 375, height: 812});
    });

    describe('initialization', () => {
        it('should initialize with translateX equal to width when animated is true', () => {
            mockUseReducedMotion.mockReturnValue(false);

            renderHook(() => useScreenTransitionAnimation(true));

            expect(mockUseSharedValue).toHaveBeenCalledWith(375);
        });

        it('should initialize with translateX equal to 0 when animated is false', () => {
            renderHook(() => useScreenTransitionAnimation(false));

            expect(mockUseSharedValue).toHaveBeenCalledWith(0);
        });

        it('should initialize with translateX equal to 0 when reducedMotion is true', () => {
            mockUseReducedMotion.mockReturnValue(true);

            renderHook(() => useScreenTransitionAnimation(true));

            expect(mockUseSharedValue).toHaveBeenCalledWith(0);
        });

        it('should default to animated when no parameter is provided', () => {
            mockUseReducedMotion.mockReturnValue(false);

            renderHook(() => useScreenTransitionAnimation());

            expect(mockUseSharedValue).toHaveBeenCalledWith(375);
        });
    });

    describe('animatedStyle', () => {
        it('should return animated style with Android duration', () => {
            Platform.OS = 'android';

            renderHook(() => useScreenTransitionAnimation(true));

            // Get the callback that was passed to useAnimatedStyle
            const animatedStyleCallback = mockUseAnimatedStyle.mock.calls[0][0];
            const style = animatedStyleCallback();

            expect(mockWithTiming).toHaveBeenCalledWith(sharedValue.value, {duration: 250});
            expect(style).toHaveProperty('transform');
        });

        it('should return animated style with iOS duration', () => {
            Platform.OS = 'ios';

            renderHook(() => useScreenTransitionAnimation(true));

            // Get the callback that was passed to useAnimatedStyle
            const animatedStyleCallback = mockUseAnimatedStyle.mock.calls[0][0];
            const style = animatedStyleCallback();

            expect(mockWithTiming).toHaveBeenCalledWith(sharedValue.value, {duration: 350});
            expect(style).toHaveProperty('transform');
        });

        it('should return transform with translateX', () => {
            renderHook(() => useScreenTransitionAnimation(true));

            // Get the callback that was passed to useAnimatedStyle
            const animatedStyleCallback = mockUseAnimatedStyle.mock.calls[0][0];
            const style = animatedStyleCallback();

            expect(style.transform).toEqual([{translateX: sharedValue.value}]);
        });
    });

    describe('focus effect', () => {
        it('should register focus effect callback', () => {
            renderHook(() => useScreenTransitionAnimation(true));

            expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should set translateX to 0 when screen is focused', () => {
            renderHook(() => useScreenTransitionAnimation(true));

            const focusEffectCallback = mockUseFocusEffect.mock.calls[0][0];
            focusEffectCallback();

            expect(sharedValue.value).toBe(0);
        });

        it('should set translateX to negative width when screen is blurred and animated', () => {
            mockUseWindowDimensions.mockReturnValue({width: 400, height: 800});

            renderHook(() => useScreenTransitionAnimation(true));

            const focusEffectCallback = mockUseFocusEffect.mock.calls[0][0];
            const cleanup = focusEffectCallback();

            cleanup();

            expect(sharedValue.value).toBe(-400);
        });

        it('should set translateX to 0 when screen is blurred and not animated', () => {
            renderHook(() => useScreenTransitionAnimation(false));

            const focusEffectCallback = mockUseFocusEffect.mock.calls[0][0];
            const cleanup = focusEffectCallback();

            cleanup();

            expect(sharedValue.value).toBe(0);
        });

        it('should set translateX to 0 when screen is blurred and reducedMotion is true', () => {
            mockUseReducedMotion.mockReturnValue(true);

            renderHook(() => useScreenTransitionAnimation(true));

            const focusEffectCallback = mockUseFocusEffect.mock.calls[0][0];
            const cleanup = focusEffectCallback();

            cleanup();

            expect(sharedValue.value).toBe(0);
        });
    });

    describe('useEffect for shouldAnimate changes', () => {
        it('should set translateX to 0 when shouldAnimate becomes false', () => {
            const {rerender} = renderHook(
                ({animated}) => useScreenTransitionAnimation(animated),
                {initialProps: {animated: true}},
            );

            // Initially should be animated
            expect(sharedValue.value).toBe(0);

            // Change to not animated
            rerender({animated: false});

            // Should reset to 0
            expect(sharedValue.value).toBe(0);
        });

        it('should not modify translateX when shouldAnimate remains true', () => {
            const {rerender} = renderHook(
                ({animated}) => useScreenTransitionAnimation(animated),
                {initialProps: {animated: true}},
            );

            sharedValue.value = 100;

            rerender({animated: true});

            // Should not reset since shouldAnimate is still true
            expect(sharedValue.value).toBe(100);
        });

        it('should reset translateX when reducedMotion becomes true', () => {
            mockUseReducedMotion.mockReturnValue(false);

            const {rerender} = renderHook(() => useScreenTransitionAnimation(true));

            sharedValue.value = 100;

            // Change reducedMotion to true
            mockUseReducedMotion.mockReturnValue(true);
            rerender();

            expect(sharedValue.value).toBe(0);
        });
    });

    describe('with different window dimensions', () => {
        it('should use correct width for larger screens', () => {
            mockUseWindowDimensions.mockReturnValue({width: 768, height: 1024});

            renderHook(() => useScreenTransitionAnimation(true));

            expect(mockUseSharedValue).toHaveBeenCalledWith(768);
        });

        it('should use correct width for smaller screens', () => {
            mockUseWindowDimensions.mockReturnValue({width: 320, height: 568});

            renderHook(() => useScreenTransitionAnimation(true));

            expect(mockUseSharedValue).toHaveBeenCalledWith(320);
        });

        it('should update animation based on width changes', () => {
            mockUseWindowDimensions.mockReturnValue({width: 375, height: 812});

            const {rerender} = renderHook(() => useScreenTransitionAnimation(true));

            const focusEffectCallback = mockUseFocusEffect.mock.calls[0][0];
            focusEffectCallback();

            // Change width
            mockUseWindowDimensions.mockReturnValue({width: 414, height: 896});
            rerender();

            // Get the new focus effect callback
            const newFocusEffectCallback = mockUseFocusEffect.mock.calls[1][0];
            const newCleanup = newFocusEffectCallback();

            newCleanup();

            // Should use new width
            expect(sharedValue.value).toBe(-414);
        });
    });

    describe('return value', () => {
        it('should return the animated style object', () => {
            const mockStyle = {transform: [{translateX: 0}]};
            mockUseAnimatedStyle.mockReturnValue(mockStyle);

            const {result} = renderHook(() => useScreenTransitionAnimation(true));

            expect(result.current).toBe(mockStyle);
        });

        it('should return style even when not animated', () => {
            const mockStyle = {transform: [{translateX: 0}]};
            mockUseAnimatedStyle.mockReturnValue(mockStyle);

            const {result} = renderHook(() => useScreenTransitionAnimation(false));

            expect(result.current).toBe(mockStyle);
        });
    });

    describe('platform-specific behavior', () => {
        it('should use 250ms duration on Android', () => {
            Platform.OS = 'android';

            renderHook(() => useScreenTransitionAnimation(true));

            const animatedStyleCallback = mockUseAnimatedStyle.mock.calls[0][0];
            animatedStyleCallback();

            expect(mockWithTiming).toHaveBeenCalledWith(
                expect.any(Number),
                {duration: 250},
            );
        });

        it('should use 350ms duration on iOS', () => {
            Platform.OS = 'ios';

            renderHook(() => useScreenTransitionAnimation(true));

            const animatedStyleCallback = mockUseAnimatedStyle.mock.calls[0][0];
            animatedStyleCallback();

            expect(mockWithTiming).toHaveBeenCalledWith(
                expect.any(Number),
                {duration: 350},
            );
        });
    });
});
