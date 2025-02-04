// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {BehaviorSubject} from 'rxjs';

import {getLoadingTeamChannelsSubject} from '@store/team_load_store';

import {useTeamsLoading} from './teams_loading';

jest.mock('@store/team_load_store', () => ({
    getLoadingTeamChannelsSubject: jest.fn(),
}));

describe('useTeamsLoading', () => {
    const mockSubject = new BehaviorSubject(0);
    const serverUrl = 'https://example.com';

    beforeEach(() => {
        (getLoadingTeamChannelsSubject as jest.Mock).mockReturnValue(mockSubject);
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockSubject.next(0);
    });

    it('should initialize with loading false', () => {
        const {result} = renderHook(() => useTeamsLoading(serverUrl));
        expect(result.current).toBe(false);
    });

    it('should update loading state when subject emits non-zero value', () => {
        const {result} = renderHook(() => useTeamsLoading(serverUrl));

        act(() => {
            mockSubject.next(1);
        });
        expect(result.current).toBe(true);

        act(() => {
            mockSubject.next(0);
        });
        expect(result.current).toBe(false);
    });

    it('should unsubscribe on unmount', () => {
        const unsubscribeSpy = jest.fn();
        const subscription = {unsubscribe: unsubscribeSpy};
        jest.spyOn(mockSubject, 'pipe').mockReturnValue({
            subscribe: () => subscription,
        } as any);

        const {unmount} = renderHook(() => useTeamsLoading(serverUrl));
        unmount();

        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
