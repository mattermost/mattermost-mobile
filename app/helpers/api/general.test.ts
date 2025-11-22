// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from './general';

describe('helpers/api/general', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });
    describe('debounce', () => {
        test('should debounce function calls', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 100);

            // Call debounced function multiple times
            debouncedFunc();
            debouncedFunc();
            debouncedFunc();

            // Function should not have been called yet
            expect(func).not.toHaveBeenCalled();

            // Fast forward time
            jest.runAllTimers();

            // Function should have been called once
            expect(func).toHaveBeenCalledTimes(1);
        });

        test('should execute callback after debounced function', () => {
            const func = jest.fn();
            const callback = jest.fn();
            const debouncedFunc = debounce(func, 100, false, callback);

            debouncedFunc();

            // Neither function should have been called yet
            expect(func).not.toHaveBeenCalled();
            expect(callback).not.toHaveBeenCalled();

            // Fast forward time
            jest.runAllTimers();

            // Both functions should have been called once
            expect(func).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should execute immediately when immediate flag is true', () => {
            const func = jest.fn();
            const callback = jest.fn();
            const debouncedFunc = debounce(func, 100, true, callback);

            debouncedFunc();

            // Both functions should be called immediately
            expect(func).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);

            // Call it again immediately
            debouncedFunc();

            // Should not call again immediately
            expect(func).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);

            // Fast forward time
            jest.runAllTimers();

            // Counts should remain the same
            expect(func).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should pass arguments to the debounced function', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 100);
            const args = ['arg1', 'arg2'];

            debouncedFunc(...args);
            jest.runAllTimers();

            expect(func).toHaveBeenCalledWith(...args);
        });
    });
});
