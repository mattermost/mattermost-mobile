// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setFetchingThreadState, subject} from './fetching_thread_store';

describe('FetchingThreadStore', () => {
    afterEach(() => {
        // Reset state after each test
        subject.next({});
    });

    it('should have initial empty state', () => {
        const state = subject.value;

        expect(state).toEqual({});
    });

    it('should set fetching state for a thread', () => {
        const rootId = 'thread-1';

        setFetchingThreadState(rootId, true);

        const state = subject.value;
        expect(state[rootId]).toBe(true);
    });

    it('should update fetching state for a thread', () => {
        const rootId = 'thread-1';

        setFetchingThreadState(rootId, true);
        expect(subject.value[rootId]).toBe(true);

        setFetchingThreadState(rootId, false);
        expect(subject.value[rootId]).toBe(false);
    });

    it('should handle multiple threads independently', () => {
        const rootId1 = 'thread-1';
        const rootId2 = 'thread-2';
        const rootId3 = 'thread-3';

        setFetchingThreadState(rootId1, true);
        setFetchingThreadState(rootId2, true);
        setFetchingThreadState(rootId3, false);

        const state = subject.value;
        expect(state[rootId1]).toBe(true);
        expect(state[rootId2]).toBe(true);
        expect(state[rootId3]).toBe(false);
    });

    it('should preserve other thread states when updating one', () => {
        const rootId1 = 'thread-1';
        const rootId2 = 'thread-2';

        setFetchingThreadState(rootId1, true);
        setFetchingThreadState(rootId2, true);

        expect(subject.value[rootId1]).toBe(true);
        expect(subject.value[rootId2]).toBe(true);

        setFetchingThreadState(rootId1, false);

        const state = subject.value;
        expect(state[rootId1]).toBe(false);
        expect(state[rootId2]).toBe(true);
    });

    it('should emit values through observable', () => {
        const mockCallback = jest.fn();
        const subscription = subject.subscribe(mockCallback);

        // Should immediately get current state
        expect(mockCallback).toHaveBeenCalledWith({});

        const rootId = 'thread-1';
        setFetchingThreadState(rootId, true);

        // Should get new state
        expect(mockCallback).toHaveBeenCalledWith({
            [rootId]: true,
        });

        setFetchingThreadState(rootId, false);

        // Should get updated state
        expect(mockCallback).toHaveBeenCalledWith({
            [rootId]: false,
        });

        expect(mockCallback).toHaveBeenCalledTimes(3);

        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        setFetchingThreadState('thread-2', true);
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid state changes', () => {
        const rootId = 'thread-1';

        setFetchingThreadState(rootId, true);
        setFetchingThreadState(rootId, false);
        setFetchingThreadState(rootId, true);
        setFetchingThreadState(rootId, false);

        expect(subject.value[rootId]).toBe(false);
    });

    it('should maintain state across multiple threads during concurrent updates', () => {
        setFetchingThreadState('thread-1', true);
        setFetchingThreadState('thread-2', true);
        setFetchingThreadState('thread-3', false);
        setFetchingThreadState('thread-1', false);
        setFetchingThreadState('thread-4', true);

        const state = subject.value;
        expect(state['thread-1']).toBe(false);
        expect(state['thread-2']).toBe(true);
        expect(state['thread-3']).toBe(false);
        expect(state['thread-4']).toBe(true);
    });
});
