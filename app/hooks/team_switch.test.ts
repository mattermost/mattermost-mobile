// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';

import {useTeamSwitch} from './team_switch';

describe('useTeamSwitch', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
    });

    afterEach(() => {
        jest.useRealTimers();
    });
    it('should initialize with loading false', () => {
        const {result} = renderHook(() => useTeamSwitch());
        expect(result.current).toBe(false);
    });

    it('should set loading true when switching starts', () => {
        const {result} = renderHook(() => useTeamSwitch());

        act(() => {
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, true);
        });
        expect(result.current).toBe(true);
    });

    it('should set loading false when switching ends', () => {
        const {result} = renderHook(() => useTeamSwitch());

        act(() => {
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, true);
        });
        expect(result.current).toBe(true);

        act(() => {
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);
            jest.runAllTimers();
        });
        expect(result.current).toBe(false);
    });

    it('should cleanup event listener on unmount', () => {
        const removeMock = jest.fn();
        jest.spyOn(DeviceEventEmitter, 'addListener').mockImplementation(() => ({
            remove: removeMock,
        } as any));

        const {unmount} = renderHook(() => useTeamSwitch());
        unmount();

        expect(removeMock).toHaveBeenCalled();
    });
});
