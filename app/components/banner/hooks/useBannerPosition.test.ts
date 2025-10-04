// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';

import * as Device from '@hooks/device';

import {useBannerPosition} from './useBannerPosition';

jest.mock('@hooks/device');
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({
        top: 44,
        bottom: 34,
        left: 0,
        right: 0,
    })),
}));

jest.mock('@constants/view', () => ({
    BOOKMARKS_BAR_HEIGHT: 40,
    CHANNEL_BANNER_HEIGHT: 60,
    DEFAULT_HEADER_HEIGHT: 56,
    TABLET_HEADER_HEIGHT: 64,
}));

describe('useBannerPosition', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(Device.useIsTablet).mockReturnValue(false);
    });

    describe('bottom position', () => {
        it('returns bottom offset for bottom position', () => {
            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'bottom',
                    includeBookmarkBar: false,
                    includeChannelBanner: false,
                    customTopOffset: 0,
                    customBottomOffset: 20,
                    threadScreen: false,
                }),
            );

            expect(result.current.positionStyle).toEqual({bottom: 20});
        });
    });

    describe('top position calculations', () => {
        it('calculates basic top position for phone', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(false);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: false,
                    includeChannelBanner: false,
                    customTopOffset: 0,
                    customBottomOffset: 0,
                    threadScreen: false,
                }),
            );

            // safeAreaTop(44) + phoneHeader(56) + basePadding(8) = 108
            expect(result.current.positionStyle).toEqual({top: 108});
        });

        it('calculates basic top position for tablet', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(true);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: false,
                    includeChannelBanner: false,
                    customTopOffset: 0,
                    customBottomOffset: 0,
                    threadScreen: false,
                }),
            );

            // safeAreaTop(44) + tabletHeader(64) + basePadding(8) = 116
            expect(result.current.positionStyle).toEqual({top: 116});
        });

        it('excludes header on thread screen', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(false);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: false,
                    includeChannelBanner: false,
                    customTopOffset: 0,
                    customBottomOffset: 0,
                    threadScreen: true,
                }),
            );

            // safeAreaTop(44) + basePadding(8) = 52 (no header)
            expect(result.current.positionStyle).toEqual({top: 52});
        });

        it('includes bookmark bar height when specified', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(false);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: true,
                    includeChannelBanner: false,
                    customTopOffset: 0,
                    customBottomOffset: 0,
                    threadScreen: false,
                }),
            );

            // safeAreaTop(44) + phoneHeader(56) + bookmarkBar(40) + basePadding(8) = 148
            expect(result.current.positionStyle).toEqual({top: 148});
        });

        it('includes channel banner height when specified', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(false);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: false,
                    includeChannelBanner: true,
                    customTopOffset: 0,
                    customBottomOffset: 0,
                    threadScreen: false,
                }),
            );

            // safeAreaTop(44) + phoneHeader(56) + channelBanner(60) + basePadding(8) = 168
            expect(result.current.positionStyle).toEqual({top: 168});
        });

        it('adds custom top offset', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(false);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: false,
                    includeChannelBanner: false,
                    customTopOffset: 25,
                    customBottomOffset: 0,
                    threadScreen: false,
                }),
            );

            // safeAreaTop(44) + phoneHeader(56) + customOffset(25) + basePadding(8) = 133
            expect(result.current.positionStyle).toEqual({top: 133});
        });

        it('calculates complex top position with all options', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(true);

            const {result} = renderHook(() =>
                useBannerPosition({
                    position: 'top',
                    includeBookmarkBar: true,
                    includeChannelBanner: true,
                    customTopOffset: 15,
                    customBottomOffset: 0,
                    threadScreen: false,
                }),
            );

            // safeAreaTop(44) + tabletHeader(64) + bookmarkBar(40) + channelBanner(60) + customOffset(15) + basePadding(8) = 231
            expect(result.current.positionStyle).toEqual({top: 231});
        });
    });
});
