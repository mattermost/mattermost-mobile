// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import {usePreventDoubleTap} from './utils';

describe('usePreventDoubleTap', () => {
    const callback = jest.fn();

    it('should allow the first tap', () => {
        const {result} = renderHook(() => usePreventDoubleTap(callback));

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalled();
    });

    it('should prevent the second tap within the delay', () => {
        const {result} = renderHook(() => usePreventDoubleTap(callback));

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should allow the tap after the delay', () => {
        jest.useFakeTimers();

        const {result} = renderHook(() => usePreventDoubleTap(callback));

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(1);

        act(() => {
            jest.advanceTimersByTime(750);
            result.current();
        });

        expect(callback).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });
    it('should return the same result if the same callback is passed', () => {
        const {result, rerender} = renderHook(() => usePreventDoubleTap(callback));

        const firstResult = result.current;

        rerender();

        const secondResult = result.current;

        expect(firstResult).toBe(secondResult);
    });
});
