// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import useInitialValue from './initial_value';

describe('useInitialValue', () => {
    test('should return the value from the factory on first render', () => {
        const factory = jest.fn(() => 42);
        const {result} = renderHook(() => useInitialValue(factory));

        expect(factory).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(42);
    });

    test('should call factory only once and keep same value on re-renders', () => {
        let callCount = 0;
        const factory = jest.fn(() => {
            callCount += 1;
            return callCount;
        });
        const {result, rerender} = renderHook(() => useInitialValue(factory));

        expect(factory).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(1);

        act(() => {
            rerender();
        });

        expect(factory).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(1);

        act(() => {
            rerender();
        });

        expect(factory).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(1);
    });

    test('should work with object values', () => {
        const initial = {id: 1, name: 'test'};
        const factory = jest.fn(() => initial);
        const {result} = renderHook(() => useInitialValue(factory));

        expect(result.current).toEqual(initial);
        expect(result.current).toBe(initial);
    });

    test('should work with string values', () => {
        const factory = jest.fn(() => 'hello');
        const {result} = renderHook(() => useInitialValue(factory));

        expect(result.current).toBe('hello');
    });
});
