// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import useThrottled from './throttled';

jest.useFakeTimers();

describe('useThrottled', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
    });

    it('should return a throttled function', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 1000));

        expect(typeof result.current).toBe('function');
    });

    it('should call callback immediately on first invocation', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 1000));

        result.current('arg1', 'arg2');

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should throttle subsequent calls within the time window', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 1000));

        // First call - should execute immediately
        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('call1');

        // Second call - should be throttled
        result.current('call2');
        expect(callback).toHaveBeenCalledTimes(1);

        // Third call - still throttled
        result.current('call3');
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should execute throttled call after time window expires', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 1000));

        // First call
        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);

        // Second call within window
        result.current('call2');
        expect(callback).toHaveBeenCalledTimes(1);

        // Advance time past the throttle window
        jest.advanceTimersByTime(1000);

        // Third call after window - should execute with most recent args
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenCalledWith('call2');
    });

    it('should handle multiple arguments', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 500));

        result.current('arg1', 'arg2', 'arg3', {key: 'value'});

        expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3', {key: 'value'});
    });

    it('should handle no arguments', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 500));

        result.current();

        expect(callback).toHaveBeenCalledWith();
    });

    it('should use the latest callback reference', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        const {result, rerender} = renderHook(
            ({cb, time}) => useThrottled(cb, time),
            {initialProps: {cb: callback1, time: 1000}},
        );

        // First call with callback1
        result.current('test1');
        expect(callback1).toHaveBeenCalledWith('test1');
        expect(callback2).not.toHaveBeenCalled();

        // Update to callback2
        rerender({cb: callback2, time: 1000});

        // Advance time to allow next call
        jest.advanceTimersByTime(1000);

        // Call with updated callback
        result.current('test2');
        expect(callback2).toHaveBeenCalledWith('test2');
    });

    it('should return the same throttled function when time does not change', () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        const {result, rerender} = renderHook(
            ({cb, time}) => useThrottled(cb, time),
            {initialProps: {cb: callback1, time: 1000}},
        );

        const throttledFn1 = result.current;

        // Change callback but keep time the same
        rerender({cb: callback2, time: 1000});

        const throttledFn2 = result.current;

        // Should be the same function reference (memoized)
        expect(throttledFn1).toBe(throttledFn2);
    });

    it('should return a new throttled function when time changes', () => {
        const callback = jest.fn();

        const {result, rerender} = renderHook(
            ({cb, time}) => useThrottled(cb, time),
            {initialProps: {cb: callback, time: 1000}},
        );

        const throttledFn1 = result.current;

        // Change the time value
        rerender({cb: callback, time: 2000});

        const throttledFn2 = result.current;

        // Should be a different function reference
        expect(throttledFn1).not.toBe(throttledFn2);
    });

    it('should respect the new time value after update', () => {
        const callback = jest.fn();

        const {result, rerender} = renderHook(
            ({time}) => useThrottled(callback, time),
            {initialProps: {time: 1000}},
        );

        // First call
        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);

        // Second call - should be throttled
        result.current('call2');
        expect(callback).toHaveBeenCalledTimes(1);

        // Change throttle time to 2000ms - this creates a new throttled function
        rerender({time: 2000});

        // Advance by 1000ms to clear the old throttled function's timer
        jest.advanceTimersByTime(1000);

        // The trailing call from the old throttled function executes
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenLastCalledWith('call2');

        // Now use the new throttled function with 2000ms throttle
        result.current('call3');
        expect(callback).toHaveBeenCalledTimes(3);

        // Call again - should be throttled with new 2000ms time
        result.current('call4');
        expect(callback).toHaveBeenCalledTimes(3);

        // Advance by 2000ms
        jest.advanceTimersByTime(2000);

        // Should execute the trailing call
        expect(callback).toHaveBeenCalledTimes(4);
        expect(callback).toHaveBeenLastCalledWith('call4');
    });

    it('should handle rapid successive calls', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 1000));

        // Make 10 rapid calls
        for (let i = 0; i < 10; i++) {
            result.current(`call${i}`);
        }

        // Only the first call should execute
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('call0');

        // Advance time
        jest.advanceTimersByTime(1000);

        // The last call should execute (trailing edge)
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenCalledWith('call9');
    });

    it('should handle zero throttle time', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 0));

        result.current('call1');
        result.current('call2');
        result.current('call3');

        // With 0ms throttle, all calls should execute
        expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should handle very short throttle time', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 10));

        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);

        result.current('call2');
        expect(callback).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10);

        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle very long throttle time', () => {
        const callback = jest.fn();
        const {result} = renderHook(() => useThrottled(callback, 60000)); // 1 minute

        result.current('call1');
        expect(callback).toHaveBeenCalledTimes(1);

        result.current('call2');
        expect(callback).toHaveBeenCalledTimes(1);

        // Advance by 59 seconds - should still be throttled
        jest.advanceTimersByTime(59000);
        expect(callback).toHaveBeenCalledTimes(1);

        // Advance by 1 more second
        jest.advanceTimersByTime(1000);
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle callback that returns a value', () => {
        const callback = jest.fn((x: number, y: number) => x + y);
        const {result} = renderHook(() => useThrottled(callback, 1000));

        const returnValue = result.current(5, 3);

        expect(returnValue).toBe(8);
        expect(callback).toHaveBeenCalledWith(5, 3);
    });

    it('should handle callback that throws an error', () => {
        const error = new Error('Test error');
        const callback = jest.fn(() => {
            throw error;
        });
        const {result} = renderHook(() => useThrottled(callback, 1000));

        expect(() => result.current()).toThrow(error);
    });

    it('should handle callback being called through the ref', () => {
        let callCount = 0;
        const callback = jest.fn(() => {
            callCount++;
            return callCount;
        });

        const {result, rerender} = renderHook(
            ({cb}) => useThrottled(cb, 1000),
            {initialProps: {cb: callback}},
        );

        // First call
        const result1 = result.current();
        expect(result1).toBe(1);
        expect(callback).toHaveBeenCalledTimes(1);

        // Update callback
        const callback2 = jest.fn(() => {
            callCount++;
            return callCount;
        });
        rerender({cb: callback2});

        // Advance time to allow next call
        jest.advanceTimersByTime(1000);

        // Call with updated callback - should use callback2 through the ref
        result.current();
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1); // Original callback not called again
    });
});
