// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import useDidMount from './did_mount';

describe('useDidMount', () => {
    test('should call callback on mount', () => {
        const callback = jest.fn();
        renderHook(() => useDidMount(callback));

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should not call callback on re-renders', () => {
        const callback = jest.fn();
        const {rerender} = renderHook(() => useDidMount(callback));

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            rerender();
        });

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            rerender();
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should call cleanup function on unmount when callback returns one', () => {
        const cleanup = jest.fn();
        const callback = jest.fn(() => cleanup);
        const {unmount} = renderHook(() => useDidMount(callback));

        expect(callback).toHaveBeenCalledTimes(1);
        expect(cleanup).not.toHaveBeenCalled();

        unmount();

        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test('should not throw when callback returns undefined', () => {
        const callback = jest.fn(() => undefined);
        expect(() => {
            renderHook(() => useDidMount(callback));
        }).not.toThrow();
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
