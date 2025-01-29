// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';

import {subject} from '@store/fetching_thread_store';

import {useFetchingThreadState} from './fetching_thread';

describe('useFetchingThreadState', () => {
    const rootId = 'test-root-id';

    afterEach(() => {
        // Clear all subjects after each test
        subject.next({});
    });

    it('should initialize with false', () => {
        const {result} = renderHook(() => useFetchingThreadState(rootId));
        expect(result.current).toBe(false);
    });

    it('should update when subject emits new state', () => {
        const {result} = renderHook(() => useFetchingThreadState(rootId));

        act(() => {
            subject.next({[rootId]: true});
        });
        expect(result.current).toBe(true);

        act(() => {
            subject.next({[rootId]: false});
        });
        expect(result.current).toBe(false);
    });

    it('should not update for different rootId', () => {
        const {result} = renderHook(() => useFetchingThreadState(rootId));

        act(() => {
            subject.next({'different-root-id': true});
        });
        expect(result.current).toBe(false);
    });

    it('should handle empty subject updates', () => {
        const {result} = renderHook(() => useFetchingThreadState(rootId));

        act(() => {
            subject.next({[rootId]: true});
        });
        expect(result.current).toBe(true);

        act(() => {
            subject.next({});
        });
        expect(result.current).toBe(false);
    });
});
