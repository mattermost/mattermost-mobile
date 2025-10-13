// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';

import {useBanner} from './useBanner';

jest.mock('react-native-reanimated', () => {
    const actualReanimated = jest.requireActual('react-native-reanimated/mock');
    return {
        ...actualReanimated,
        useSharedValue: jest.fn((initial) => ({value: initial})),
        useAnimatedStyle: jest.fn((callback) => callback()),
        withTiming: jest.fn((value) => value),
        runOnJS: jest.fn((fn) => fn),
    };
});

jest.mock('react-native-gesture-handler', () => ({
    Gesture: {
        Pan: jest.fn(() => ({
            onStart: jest.fn().mockReturnThis(),
            onUpdate: jest.fn().mockReturnThis(),
            onEnd: jest.fn().mockReturnThis(),
        })),
    },
}));

describe('useBanner', () => {
    const defaultProps = {
        animationDuration: 250,
        dismissible: true,
        swipeThreshold: 100,
        onDismiss: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns animatedStyle and swipeGesture', () => {
        const {result} = renderHook(() => useBanner(defaultProps));

        expect(result.current).toHaveProperty('animatedStyle');
        expect(result.current).toHaveProperty('swipeGesture');
    });

    it('initializes with visible state', () => {
        const {result} = renderHook(() => useBanner(defaultProps));

        expect(result.current.animatedStyle).toBeDefined();
    });

    it('creates gesture when dismissible is true', () => {
        const {result} = renderHook(() => useBanner({
            ...defaultProps,
            dismissible: true,
        }));

        expect(result.current.swipeGesture).toBeDefined();
    });

    it('creates gesture when dismissible is false', () => {
        const {result} = renderHook(() => useBanner({
            ...defaultProps,
            dismissible: false,
        }));

        expect(result.current.swipeGesture).toBeDefined();
    });
});

