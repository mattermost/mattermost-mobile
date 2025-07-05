// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {act} from '@testing-library/react-native';

import ViewConstants from '@constants/view';

import * as DeviceFunctions from './device';
import {useCollapsibleHeader} from './header';

const LARGE_HEADER_TITLE_HEIGHT = 128;
const HEADER_OFFSET = LARGE_HEADER_TITLE_HEIGHT - ViewConstants.DEFAULT_HEADER_HEIGHT;

describe('useCollapsibleHeader', () => {
    const commonHookResponse = {
        largeHeight: LARGE_HEADER_TITLE_HEIGHT,
        scrollRef: expect.any(Function),
        scrollValue: expect.objectContaining({value: 0}),
        onScroll: expect.any(Object),
        hideHeader: expect.any(Function),
        lockValue: 0,
        unlock: expect.any(Function),
        headerOffset: HEADER_OFFSET,
        scrollEnabled: expect.objectContaining({value: true}),
        setAutoScroll: expect.any(Function),
    };

    it('should return the correct values with isLargeTitle is true', () => {
        const {result} = renderHook(() => useCollapsibleHeader(true));

        expect(result.current).toEqual({
            defaultHeight: ViewConstants.DEFAULT_HEADER_HEIGHT,
            scrollPaddingTop: LARGE_HEADER_TITLE_HEIGHT,
            headerHeight: expect.objectContaining({
                value: LARGE_HEADER_TITLE_HEIGHT,
            }),
            ...commonHookResponse,
        });
    });

    it('should return the correct values with isLargeTitle is false', () => {
        const {result} = renderHook(() => useCollapsibleHeader(false));

        expect(result.current).toEqual({
            defaultHeight: ViewConstants.DEFAULT_HEADER_HEIGHT,
            scrollPaddingTop: ViewConstants.DEFAULT_HEADER_HEIGHT,
            headerHeight: expect.objectContaining({
                value: ViewConstants.DEFAULT_HEADER_HEIGHT,
            }),
            ...commonHookResponse,
        });
    });

    it('should return the correct values with isLargeTitle is true, and on a tablet', () => {
        jest.spyOn(DeviceFunctions, 'useIsTablet').mockReturnValue(true);

        const {result} = renderHook(() => useCollapsibleHeader(true));

        expect(result.current).toEqual({
            defaultHeight: ViewConstants.TABLET_HEADER_HEIGHT,
            scrollPaddingTop: LARGE_HEADER_TITLE_HEIGHT,
            headerHeight: expect.objectContaining({
                value: LARGE_HEADER_TITLE_HEIGHT,
            }),
            ...commonHookResponse,
        });
    });

    it('should change the lock value when hideHeader is called', () => {
        const {result} = renderHook(() => useCollapsibleHeader(true));

        expect(result.current.lockValue).toBe(0);

        act(() => result.current.hideHeader(true));

        expect(result.current.lockValue).toBe(ViewConstants.DEFAULT_HEADER_HEIGHT);
    });

    it('should reset the lockValue when unlock is called', () => {
        const {result} = renderHook(() => useCollapsibleHeader(true));

        act(() => result.current.hideHeader(true));

        expect(result.current.lockValue).toBe(ViewConstants.DEFAULT_HEADER_HEIGHT);

        act(() => result.current.unlock());

        expect(result.current.lockValue).toBe(0);
    });
});
