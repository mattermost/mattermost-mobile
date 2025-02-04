// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';

import useFreeze from './freeze';

describe('useFreeze hook', () => {
    it('should initialize with default values', () => {
        const {result} = renderHook(() => useFreeze());

        expect(result.current.freeze).toBe(false);
        expect(result.current.backgroundColor).toBe('#000');
    });

    it('should update freeze state when event is emitted', () => {
        const {result} = renderHook(() => useFreeze());

        act(() => {
            DeviceEventEmitter.emit(Events.FREEZE_SCREEN, true);
        });

        expect(result.current.freeze).toBe(true);
        expect(result.current.backgroundColor).toBe('#000');
    });

    it('should update backgroundColor when provided with event', () => {
        const {result} = renderHook(() => useFreeze());
        const testColor = '#fff';

        act(() => {
            DeviceEventEmitter.emit(Events.FREEZE_SCREEN, true, testColor);
        });

        expect(result.current.freeze).toBe(true);
        expect(result.current.backgroundColor).toBe(testColor);
    });

    it('should cleanup event listener on unmount', () => {
        const removeMock = jest.fn();
        jest.spyOn(DeviceEventEmitter, 'addListener').mockReturnValue({
            remove: removeMock,
        } as any);

        const {unmount} = renderHook(() => useFreeze());

        unmount();

        expect(removeMock).toHaveBeenCalled();
    });
});
