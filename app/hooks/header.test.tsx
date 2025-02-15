// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {act} from '@testing-library/react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewConstants from '@constants/view';
import {useIsTablet} from '@hooks/device';

import {useDefaultHeaderHeight, useLargeHeaderHeight, useHeaderHeight, useCollapsibleHeader} from './header';

jest.mock('react-native-reanimated', () => {
    const sharedValues = new Map();

    return {
        ...jest.requireActual('react-native-reanimated/mock'),
        useAnimatedRef: jest.fn(() => ({
            current: {
                scrollTo: jest.fn(),
            },
        })),
        useSharedValue: jest.fn((initial) => {
            const key = Math.random();
            const sv = {
                value: initial,
                _key: key,
            };
            sharedValues.set(key, sv);
            return sv;
        }),
        useAnimatedScrollHandler: jest.fn((handlers) => (event: any) => {
            if (handlers.onScroll) {
                handlers.onScroll(event);
            }
        }),
        scrollTo: jest.fn(),
    };
});

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
}));

describe('Header Hooks', () => {
    beforeEach(() => {
        (useSafeAreaInsets as jest.Mock).mockReturnValue({top: 20});
        (useIsTablet as jest.Mock).mockReturnValue(false);
    });

    describe('useDefaultHeaderHeight', () => {
        it('should return correct height for mobile', () => {
            const {result} = renderHook(() => useDefaultHeaderHeight());
            expect(result.current).toBe(ViewConstants.DEFAULT_HEADER_HEIGHT + 20);
        });

        it('should return correct height for tablet', () => {
            (useIsTablet as jest.Mock).mockReturnValue(true);
            const {result} = renderHook(() => useDefaultHeaderHeight());
            expect(result.current).toBe(ViewConstants.TABLET_HEADER_HEIGHT + 20);
        });
    });

    describe('useLargeHeaderHeight', () => {
        it('should return correct large header height', () => {
            const {result} = renderHook(() => useLargeHeaderHeight());
            const expectedHeight = ViewConstants.DEFAULT_HEADER_HEIGHT +
                                 ViewConstants.LARGE_HEADER_TITLE_HEIGHT +
                                 ViewConstants.SUBTITLE_HEIGHT + 20;
            expect(result.current).toBe(expectedHeight);
        });
    });

    describe('useHeaderHeight', () => {
        it('should return correct height values', () => {
            const {result} = renderHook(() => useHeaderHeight());
            const defaultHeight = ViewConstants.DEFAULT_HEADER_HEIGHT + 20;
            const largeHeight = defaultHeight +
                              ViewConstants.LARGE_HEADER_TITLE_HEIGHT +
                              ViewConstants.SUBTITLE_HEIGHT;

            expect(result.current).toEqual({
                defaultHeight,
                largeHeight,
                headerOffset: largeHeight - defaultHeight,
            });
        });
    });

    describe('useCollapsibleHeader', () => {
        const mockScrollTo = jest.fn();
        const mockScrollToOffset = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should initialize with correct values', () => {
            const onSnap = jest.fn();
            const {result} = renderHook(() => useCollapsibleHeader(true, onSnap));

            expect(result.current.defaultHeight).toBeDefined();
            expect(result.current.largeHeight).toBeDefined();
            expect(result.current.scrollPaddingTop).toBeDefined();
            expect(result.current.scrollRef).toBeDefined();
            expect(result.current.scrollValue).toBeDefined();
            expect(result.current.onScroll).toBeDefined();
            expect(result.current.hideHeader).toBeDefined();
            expect(result.current.lockValue).toBe(0);
            expect(result.current.scrollEnabled.value).toBe(true);
        });

        it('should handle header lock and unlock', () => {
            const {result} = renderHook(() => useCollapsibleHeader(true));

            act(() => {
                result.current.hideHeader(true);
            });
            expect(result.current.lockValue).toBe(result.current.defaultHeight);
            act(() => {
                result.current.scrollEnabled.value = false;
            });
            expect(result.current.scrollEnabled.value).toBe(false);

            act(() => {
                result.current.unlock();
            });
            expect(result.current.lockValue).toBe(0);
            expect(result.current.scrollEnabled.value).toBe(true);
        });

        it('should handle auto-scroll correctly', () => {
            const {result} = renderHook(() => useCollapsibleHeader(true));

            act(() => {
                result.current.setAutoScroll(true);
            });

            expect(result.current.scrollValue.value).toBe(0);
        });

        it('should calculate correct scroll padding for large and normal headers', () => {
            const {result: largeTitleResult} = renderHook(() => useCollapsibleHeader(true));
            const {result: normalTitleResult} = renderHook(() => useCollapsibleHeader(false));

            expect(largeTitleResult.current.scrollPaddingTop).toBe(largeTitleResult.current.largeHeight);
            expect(normalTitleResult.current.scrollPaddingTop).toBe(normalTitleResult.current.defaultHeight);
        });

        it('should handle hideHeader with scrollTo', () => {
            const {result} = renderHook(() => useCollapsibleHeader(true));

            // @ts-expect-error override for test mock
            result.current.scrollRef.current = {
                scrollTo: mockScrollTo,
            } as any;

            act(() => {
                result.current.hideHeader();
            });

            expect(mockScrollTo).toHaveBeenCalledWith({
                y: result.current.headerOffset,
                animated: true,
            });
        });

        it('should handle hideHeader with scrollToOffset', () => {
            const {result} = renderHook(() => useCollapsibleHeader(true));

            // @ts-expect-error override for test mock
            result.current.scrollRef.current = {
                scrollToOffset: mockScrollToOffset,
            } as any;

            act(() => {
                result.current.hideHeader();
            });

            expect(mockScrollToOffset).toHaveBeenCalledWith({
                offset: result.current.headerOffset,
                animated: true,
            });
        });

        it('should handle snap callback', () => {
            const onSnap = jest.fn();
            const {result} = renderHook(() => useCollapsibleHeader(true, onSnap));

            act(() => {
                const mockScrollEvent = {
                    contentOffset: {y: 10},
                    contentSize: {height: 1000},
                    layoutMeasurement: {height: 100},
                };

                // Simulate scroll event
                result.current.scrollValue.value = mockScrollEvent.contentOffset.y;
                result.current.onScroll(mockScrollEvent as any);
            });

            expect(result.current.scrollValue.value).toBe(10);
        });
    });
});
