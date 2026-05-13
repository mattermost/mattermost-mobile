// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {advanceTimers} from '@test/timer_helpers';

import {debounce} from './general';

describe('debounce', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should call the function after the wait period', async () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);

        debounced();
        expect(fn).not.toHaveBeenCalled();

        await advanceTimers(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only call the function once when invoked multiple times within the wait period', async () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);

        debounced();
        debounced();
        debounced();

        await advanceTimers(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments through to the underlying function', async () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100);

        debounced('a', 'b', 'c');
        await advanceTimers(100);

        expect(fn).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('should call the callback after the function runs', async () => {
        const fn = jest.fn();
        const cb = jest.fn();
        const debounced = debounce(fn, 100, false, cb);

        debounced();
        await advanceTimers(100);

        expect(fn).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should call the function immediately when immediate is true', async () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100, true);

        debounced();
        expect(fn).toHaveBeenCalledTimes(1);

        // Should not fire again within the wait period
        debounced();
        expect(fn).toHaveBeenCalledTimes(1);

        await advanceTimers(100);

        // Still no additional call after wait elapses for first debounce window
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call cb immediately when immediate is true', async () => {
        const fn = jest.fn();
        const cb = jest.fn();
        const debounced = debounce(fn, 100, true, cb);

        debounced();
        expect(fn).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should allow calling again after the wait period expires with immediate mode', async () => {
        const fn = jest.fn();
        const debounced = debounce(fn, 100, true);

        debounced();
        expect(fn).toHaveBeenCalledTimes(1);

        await advanceTimers(100);

        debounced();
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
