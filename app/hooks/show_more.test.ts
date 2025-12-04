// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {withTiming} from 'react-native-reanimated';

import {useShowMoreAnimatedStyle} from './show_more';

jest.mock('react-native-reanimated', () => ({
    useAnimatedStyle: (callback: () => any) => callback(),
    withTiming: jest.fn((value) => value),
}));

describe('useShowMoreAnimatedStyle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns maxHeight when height is undefined', () => {
        const maxHeight = 100;
        const {result} = renderHook(() =>
            useShowMoreAnimatedStyle(undefined, maxHeight, false),
        );

        expect(result.current).toEqual({
            maxHeight,
        });
    });

    it('animates to maxHeight when not open', () => {
        const height = 200;
        const maxHeight = 100;
        const {result} = renderHook(() =>
            useShowMoreAnimatedStyle(height, maxHeight, false),
        );

        expect(result.current).toEqual({
            maxHeight,
        });
        expect(withTiming).toHaveBeenCalledWith(maxHeight, {duration: 300});
    });

    it('animates to full height when open', () => {
        const height = 200;
        const maxHeight = 100;
        const {result} = renderHook(() =>
            useShowMoreAnimatedStyle(height, maxHeight, true),
        );

        expect(result.current).toEqual({
            maxHeight: height,
        });
        expect(withTiming).toHaveBeenCalledWith(height, {duration: 300});
    });
});
