// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils/src';
import {act, renderHook} from '@testing-library/react-native';
import {AppState} from 'react-native';

import {advanceTimers} from '@test/timer_helpers';
import {saveOutOfOfficeSettings, type WeeklyOutOfOfficeSettings} from '@utils/out_of_office';

import useOutOfOfficeCallsSuppressed from './out_of_office';

const serverUrl = 'https://community.mattermost.com';
const settings: WeeklyOutOfOfficeSettings = {
    schedule: 'weekly',
    enabled: true,
    quietHoursEnabled: true,
    startMinute: 22 * 60,
    endMinute: 7 * 60,
    daysOff: [],
    allowCalls: false,
    allowMentions: false,
};

describe('useOutOfOfficeCallsSuppressed', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(new Date(2026, 10, 16, 21, 59, 30));
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValue(JSON.stringify(settings));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValue(null);
    });

    it('should suppress a mounted incoming call at the next recurring start minute', async () => {
        const {result, unmount} = renderHook(() => useOutOfOfficeCallsSuppressed(serverUrl));
        await act(async () => advanceTimers(0));
        expect(result.current).toBe(false);

        await act(async () => advanceTimers(30000));
        expect(result.current).toBe(true);
        unmount();
    });

    it('should resume notifications at the recurring end minute', async () => {
        jest.setSystemTime(new Date(2026, 10, 17, 6, 59, 30));
        const {result, unmount} = renderHook(() => useOutOfOfficeCallsSuppressed(serverUrl));
        await act(async () => advanceTimers(0));
        expect(result.current).toBe(true);

        await act(async () => advanceTimers(30000));
        expect(result.current).toBe(false);
        unmount();
    });

    it('should refresh a mounted banner after saving this server but ignore other servers', async () => {
        jest.setSystemTime(new Date(2026, 10, 16, 23));
        const {result, unmount} = renderHook(() => useOutOfOfficeCallsSuppressed(serverUrl));
        await act(async () => advanceTimers(0));
        expect(result.current).toBe(true);

        const readsBeforeOtherServer = jest.mocked(RNUtils.getOutOfOfficeSettings).mock.calls.length;
        await act(async () => saveOutOfOfficeSettings('https://other.example.com', {...settings, allowCalls: true}));
        expect(RNUtils.getOutOfOfficeSettings).toHaveBeenCalledTimes(readsBeforeOtherServer);
        expect(result.current).toBe(true);

        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValue(JSON.stringify({...settings, allowCalls: true}));
        await act(async () => saveOutOfOfficeSettings(serverUrl, {...settings, allowCalls: true}));
        expect(result.current).toBe(false);
        unmount();
    });

    it('should re-evaluate the local clock when returning from the background', async () => {
        const {result, unmount} = renderHook(() => useOutOfOfficeCallsSuppressed(serverUrl));
        await act(async () => advanceTimers(0));
        expect(result.current).toBe(false);

        await act(async () => {
            jest.mocked(AppState.addEventListener).mock.calls[0][1]('background');
        });
        jest.setSystemTime(new Date(2026, 10, 16, 23));
        await act(async () => {
            jest.mocked(AppState.addEventListener).mock.calls[1][1]('active');
        });
        expect(result.current).toBe(true);
        unmount();
    });

    it('should ignore an older settings read that resolves after a saved exception', async () => {
        jest.setSystemTime(new Date(2026, 10, 16, 23));
        const staleReads: Array<(value: string | null) => void> = [];
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockImplementationOnce(() => new Promise((resolve) => staleReads.push(resolve)));
        const {result, unmount} = renderHook(() => useOutOfOfficeCallsSuppressed(serverUrl));

        const allowCalls = {...settings, allowCalls: true};
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValue(JSON.stringify(allowCalls));
        await act(async () => saveOutOfOfficeSettings(serverUrl, allowCalls));
        expect(result.current).toBe(false);

        await act(async () => {
            staleReads[0](JSON.stringify(settings));
            await advanceTimers(0);
        });
        expect(result.current).toBe(false);
        unmount();
    });

    it('should stop checking settings after unmount', async () => {
        const {unmount} = renderHook(() => useOutOfOfficeCallsSuppressed(serverUrl));
        await act(async () => advanceTimers(0));
        unmount();
        const readsBeforeUnmount = jest.mocked(RNUtils.getOutOfOfficeSettings).mock.calls.length;
        await act(async () => advanceTimers(60000));
        await act(async () => saveOutOfOfficeSettings(serverUrl, {...settings, enabled: false}));
        expect(RNUtils.getOutOfOfficeSettings).toHaveBeenCalledTimes(readsBeforeUnmount);
    });
});
