// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {Platform} from 'react-native';

import {
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
    FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET,
    TABLET_SIDEBAR_WIDTH,
} from '@constants/view';
import * as Device from '@hooks/device';

import {useBannerGestureRootPosition, testExports} from './useBannerGestureRootPosition';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
    useKeyboardHeight: jest.fn(),
    useWindowDimensions: jest.fn(),
}));

describe('useBannerGestureRootPosition', () => {
    const {BANNER_TABLET_WIDTH_PERCENTAGE} = testExports;
    const mockUseIsTablet = jest.mocked(Device.useIsTablet);
    const mockUseKeyboardHeight = jest.mocked(Device.useKeyboardHeight);
    const mockUseWindowDimensions = jest.mocked(Device.useWindowDimensions);

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseIsTablet.mockReturnValue(false);
        mockUseKeyboardHeight.mockReturnValue(0);
        mockUseWindowDimensions.mockReturnValue({width: 375, height: 812});
    });

    describe('top position', () => {
        it('should return correct style for top banner on phone', () => {
            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'top',
                    containerHeight: 40,
                }),
            );

            expect(result.current).toEqual({
                height: 40,
                top: 0,
            });
        });

        it('should return correct style for top banner on tablet', () => {
            mockUseIsTablet.mockReturnValue(true);
            mockUseWindowDimensions.mockReturnValue({width: 1024, height: 768});

            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'top',
                    containerHeight: 40,
                }),
            );

            const diffWidth = 1024 - TABLET_SIDEBAR_WIDTH;
            const expectedMaxWidth = (BANNER_TABLET_WIDTH_PERCENTAGE / 100) * diffWidth;

            expect(result.current).toEqual({
                height: 40,
                top: 0,
                maxWidth: expectedMaxWidth,
                alignSelf: 'center',
            });
        });
    });

    describe('bottom position - iOS', () => {
        beforeEach(() => {
            Platform.OS = 'ios';
        });

        it('should return correct style for bottom banner on phone without keyboard', () => {
            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            expect(result.current).toEqual({
                height: 40,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS,
            });
        });

        it('should return correct style for bottom banner on phone with keyboard', () => {
            mockUseKeyboardHeight.mockReturnValue(300);

            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            expect(result.current).toEqual({
                height: 40,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS + 300,
            });
        });

        it('should return correct style for bottom banner on tablet without keyboard', () => {
            mockUseIsTablet.mockReturnValue(true);
            mockUseWindowDimensions.mockReturnValue({width: 1024, height: 768});

            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            const diffWidth = 1024 - TABLET_SIDEBAR_WIDTH;
            const expectedMaxWidth = (BANNER_TABLET_WIDTH_PERCENTAGE / 100) * diffWidth;
            const expectedBottom = FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS + FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET;

            expect(result.current).toEqual({
                height: 40,
                bottom: expectedBottom,
                maxWidth: expectedMaxWidth,
                alignSelf: 'center',
            });
        });

        it('should return correct style for bottom banner on tablet with keyboard', () => {
            mockUseIsTablet.mockReturnValue(true);
            mockUseKeyboardHeight.mockReturnValue(300);
            mockUseWindowDimensions.mockReturnValue({width: 1024, height: 768});

            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            const diffWidth = 1024 - TABLET_SIDEBAR_WIDTH;
            const expectedMaxWidth = (BANNER_TABLET_WIDTH_PERCENTAGE / 100) * diffWidth;

            expect(result.current).toEqual({
                height: 40,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS + 300,
                maxWidth: expectedMaxWidth,
                alignSelf: 'center',
            });
        });
    });

    describe('bottom position - Android', () => {
        beforeEach(() => {
            Platform.OS = 'android';
        });

        it('should return correct style for bottom banner on phone', () => {
            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            expect(result.current).toEqual({
                height: 40,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
            });
        });

        it('should ignore keyboard height on Android', () => {
            mockUseKeyboardHeight.mockReturnValue(300);

            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            expect(result.current).toEqual({
                height: 40,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
            });
        });

        it('should return correct style for bottom banner on tablet', () => {
            mockUseIsTablet.mockReturnValue(true);
            mockUseWindowDimensions.mockReturnValue({width: 1024, height: 768});

            const {result} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            const diffWidth = 1024 - TABLET_SIDEBAR_WIDTH;
            const expectedMaxWidth = (BANNER_TABLET_WIDTH_PERCENTAGE / 100) * diffWidth;

            expect(result.current).toEqual({
                height: 40,
                bottom: FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
                maxWidth: expectedMaxWidth,
                alignSelf: 'center',
            });
        });
    });

    describe('container height variations', () => {
        it('should handle different container heights', () => {
            const {result: result1} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'top',
                    containerHeight: 100,
                }),
            );

            expect(result1.current.height).toBe(100);

            const {result: result2} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'top',
                    containerHeight: 200,
                }),
            );

            expect(result2.current.height).toBe(200);
        });
    });

    describe('memoization', () => {
        it('should memoize result when dependencies do not change', () => {
            mockUseIsTablet.mockReturnValue(false);
            mockUseKeyboardHeight.mockReturnValue(0);
            mockUseWindowDimensions.mockReturnValue({width: 375, height: 812});

            const {result, rerender} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'top',
                    containerHeight: 40,
                }),
            );

            const firstResult = result.current;
            rerender();
            const secondResult = result.current;

            expect(firstResult).toBe(secondResult);
        });

        it('should recompute when keyboard height changes', () => {
            Platform.OS = 'ios';
            mockUseKeyboardHeight.mockReturnValue(0);

            const {result, rerender} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'bottom',
                    containerHeight: 40,
                }),
            );

            const firstResult = result.current;

            mockUseKeyboardHeight.mockReturnValue(300);
            rerender();
            const secondResult = result.current;

            expect(firstResult).not.toBe(secondResult);
            expect(secondResult.bottom).toBe(FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS + 300);
        });

        it('should recompute when tablet state changes', () => {
            mockUseIsTablet.mockReturnValue(false);
            mockUseWindowDimensions.mockReturnValue({width: 375, height: 812});

            const {result, rerender} = renderHook(() =>
                useBannerGestureRootPosition({
                    position: 'top',
                    containerHeight: 40,
                }),
            );

            const firstResult = result.current;

            mockUseIsTablet.mockReturnValue(true);
            mockUseWindowDimensions.mockReturnValue({width: 1024, height: 768});
            rerender();
            const secondResult = result.current;

            expect(firstResult).not.toBe(secondResult);
            expect(secondResult.maxWidth).toBeDefined();
            expect(secondResult.alignSelf).toBe('center');
        });
    });
});

