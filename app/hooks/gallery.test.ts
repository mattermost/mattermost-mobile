// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {useSharedValue} from 'react-native-reanimated';

import {useGallery} from '@context/gallery';

import {useGalleryControls, useGalleryItem, diff} from './gallery';

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

    test('useGalleryControls', () => {
        (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: false}));
        const {result} = renderHook(() => useGalleryControls());

        act(() => {
            result.current.hideHeaderAndFooter(true);
        });

        expect(result.current.headerAndFooterHidden.value).toBe(true);

        act(() => {
            result.current.hideHeaderAndFooter(false);
        });

        expect(result.current.headerAndFooterHidden.value).toBe(false);
    });

    test('useGalleryControls does not update headerAndFooterHidden when same value is set', () => {
        const mockWithTiming = jest.fn();
        (useSharedValue as jest.Mock).mockImplementationOnce(() => ({value: true}));

        const {result} = renderHook(() => useGalleryControls());

        act(() => {
            result.current.hideHeaderAndFooter(true);
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
