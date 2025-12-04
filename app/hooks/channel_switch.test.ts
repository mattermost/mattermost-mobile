// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';

import {useChannelSwitch} from './channel_switch';

describe('useChannelSwitch', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('should initialize with loading false', () => {
        const {result} = renderHook(() => useChannelSwitch());
        expect(result.current).toBe(false);
    });

    it('should set loading true when switching starts', () => {
        const {result} = renderHook(() => useChannelSwitch());

        act(() => {
            DeviceEventEmitter.emit(Events.CHANNEL_SWITCH, true);
        });

        expect(result.current).toBe(true);
    });

    it('should set loading false when switching ends', () => {
        const {result} = renderHook(() => useChannelSwitch());

        act(() => {
            DeviceEventEmitter.emit(Events.CHANNEL_SWITCH, true);
        });
        expect(result.current).toBe(true);

        act(() => {
            DeviceEventEmitter.emit(Events.CHANNEL_SWITCH, false);
            jest.runAllTimers();
        });
        expect(result.current).toBe(false);
    });

    it('should cleanup event listener on unmount', () => {
        const removeMock = jest.fn();
        jest.spyOn(DeviceEventEmitter, 'addListener').mockReturnValue({
            remove: removeMock,
        } as any);

        const {unmount} = renderHook(() => useChannelSwitch());
        unmount();

        expect(removeMock).toHaveBeenCalled();
    });
});
