// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-native';
import {BehaviorSubject, type Observable, type Subscription} from 'rxjs';

import {getHasEverStartedSyncSubject, getLoadingTeamChannelsSubject} from '@store/team_load_store';

import {useIsInitialSync} from './is_initial_sync';

jest.mock('@store/team_load_store', () => ({
    getLoadingTeamChannelsSubject: jest.fn(),
    getHasEverStartedSyncSubject: jest.fn(),
}));

describe('useIsInitialSync', () => {
    const teamLoadingSubject = new BehaviorSubject(0);
    const syncStartedSubject = new BehaviorSubject(false);
    const serverUrl = 'https://example.com';

    beforeEach(() => {
        (getLoadingTeamChannelsSubject as jest.Mock).mockReturnValue(teamLoadingSubject);
        (getHasEverStartedSyncSubject as jest.Mock).mockReturnValue(syncStartedSubject);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        teamLoadingSubject.next(0);
        syncStartedSubject.next(false);
    });

    it('should return true when sync has never started and not loading', () => {
        const {result} = renderHook(() => useIsInitialSync(serverUrl));
        expect(result.current).toBe(true);
    });

    it('should return false once sync has started and no loading is in flight', () => {
        syncStartedSubject.next(true);

        const {result} = renderHook(() => useIsInitialSync(serverUrl));
        expect(result.current).toBe(false);
    });

    it('should return true while loading even if sync has previously started', () => {
        syncStartedSubject.next(true);
        teamLoadingSubject.next(1);

        const {result} = renderHook(() => useIsInitialSync(serverUrl));
        expect(result.current).toBe(true);
    });

    it('should update when either subject emits', () => {
        const {result} = renderHook(() => useIsInitialSync(serverUrl));
        expect(result.current).toBe(true);

        act(() => {
            syncStartedSubject.next(true);
        });
        expect(result.current).toBe(false);

        act(() => {
            teamLoadingSubject.next(1);
        });
        expect(result.current).toBe(true);

        act(() => {
            teamLoadingSubject.next(0);
        });
        expect(result.current).toBe(false);
    });

    it('should unsubscribe from both subjects on unmount', () => {
        const loadingUnsub = jest.fn();
        const syncStartedUnsub = jest.fn();
        const fakeLoadingObservable = {
            subscribe: () => ({unsubscribe: loadingUnsub} as unknown as Subscription),
        } as unknown as Observable<boolean>;
        jest.spyOn(teamLoadingSubject, 'pipe').mockReturnValue(fakeLoadingObservable);
        jest.spyOn(syncStartedSubject, 'subscribe').mockReturnValue({unsubscribe: syncStartedUnsub} as unknown as Subscription);

        const {unmount} = renderHook(() => useIsInitialSync(serverUrl));
        unmount();

        expect(loadingUnsub).toHaveBeenCalled();
        expect(syncStartedUnsub).toHaveBeenCalled();
    });
});
