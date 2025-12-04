// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import useDidUpdate from './did_update';

describe('useDidUpdate', () => {
    test('should not call callback on mount', () => {
        const callback = jest.fn();
        renderHook(() => useDidUpdate(callback));

        expect(callback).not.toHaveBeenCalled();
    });

    test('should call callback when dependencies change', () => {
        const callback = jest.fn();
        const {rerender} = renderHook(({dep}) => useDidUpdate(callback, [dep]), {
            initialProps: {dep: 1},
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            rerender({dep: 2});
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should maintain mounted state across re-renders with same deps', () => {
        const callback = jest.fn();
        const {rerender} = renderHook(({dep}) => useDidUpdate(callback, [dep]), {
            initialProps: {dep: 1},
        });

        expect(callback).not.toHaveBeenCalled();

        // Re-render with same dependency
        act(() => {
            rerender({dep: 1});
        });

        expect(callback).not.toHaveBeenCalled();

        // Change dependency
        act(() => {
            rerender({dep: 2});
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
