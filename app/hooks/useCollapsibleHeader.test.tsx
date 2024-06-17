// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {renderHook} from '@testing-library/react-hooks';
import {act} from '@testing-library/react-native';

import ViewConstants from '@constants/view';

import {useCollapsibleHeader} from './header';

describe('useCollapsibleHeader', () => {
    it('should return the correct values', () => {
        const {result} = renderHook(() => useCollapsibleHeader(true));
        expect(result.current).toEqual({
            defaultHeight: ViewConstants.DEFAULT_HEADER_HEIGHT,
            largeHeight: 128,
            scrollPaddingTop: 128,
            scrollRef: {current: null},
            scrollValue: {value: 0},
            onScroll: expect.any(Function),
            hideHeader: expect.any(Function),
            lockValue: 0,
            unlock: expect.any(Function),
            headerHeight: {value: 128},
            headerOffset: 84,
            scrollEnabled: {value: true},
            setAutoScroll: expect.any(Function),
        });
    });

    it('should change the lock value when hideHeader is called', () => {
        const {result} = renderHook(() => useCollapsibleHeader(true));

        expect(result.current.lockValue).toBe(0);

        act(() => result.current.hideHeader(true));

        expect(result.current.lockValue).toBe(44);
    });

    it('should reset the lockValue when unlock is called', () => {
        const {result} = renderHook(() => useCollapsibleHeader(true));

        act(() => result.current.hideHeader(true));

        expect(result.current.lockValue).toBe(44);

        act(() => result.current.unlock());

        expect(result.current.lockValue).toBe(0);
    });
});
