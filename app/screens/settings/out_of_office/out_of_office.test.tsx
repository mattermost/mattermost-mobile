// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {Platform} from 'react-native';

import English from '@assets/i18n/en.json';
import {fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';
import * as OutOfOfficeSettings from '@utils/out_of_office';
import * as Timezone from '@utils/timezone';

import OutOfOffice from './index';

import type {WeeklyOutOfOfficeSettings as Settings} from '@utils/out_of_office';

const savedSettings: Settings = {
    enabled: true,
    schedule: 'weekly',
    quietHoursEnabled: true,
    startMinute: 18 * 60,
    endMinute: 9 * 60,
    daysOff: [],
    allowCalls: false,
    allowMentions: false,
};

describe('Out of office settings', () => {
    let load: jest.SpyInstance;
    let save: jest.SpyInstance;

    beforeEach(() => {
        jest.spyOn(Timezone, 'getDeviceTimezone').mockReturnValue('Asia/Tehran');
        load = jest.spyOn(OutOfOfficeSettings, 'getOutOfOfficeSettings').mockResolvedValue(savedSettings);
        save = jest.spyOn(OutOfOfficeSettings, 'saveOutOfOfficeSettings').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should save recurring overnight hours and two days off with independent exceptions only on explicit save', async () => {
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy());
        fireEvent(screen.getByTestId('out_of_office_settings.allow_calls.toggled.false.button'), 'valueChange', true);
        expect(screen.getByTestId('out_of_office_settings.allow_mentions.toggled.false.button')).toBeTruthy();
        fireEvent(screen.getByTestId('out_of_office_settings.day.4.toggled.false.button'), 'valueChange', true);
        fireEvent(screen.getByTestId('out_of_office_settings.day.5.toggled.false.button'), 'valueChange', true);
        expect(save).not.toHaveBeenCalled();
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), {...savedSettings, daysOff: [4, 5], allowCalls: true}));
    });

    it('should edit wall clock hours using a time-only picker', async () => {
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy());
        fireEvent.press(screen.getByTestId('out_of_office_settings.end'));
        const {UNSAFE_getByType: getByType} = screen;
        const picker = getByType(DateTimePicker);
        expect(picker.props.mode).toBe('time');
        fireEvent(picker, 'valueChange', {type: 'set'}, new Date(2024, 0, 15, 7, 30));
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), {...savedSettings, endMinute: 450}));
    });

    it('should reject equal quiet hours without persisting them', async () => {
        load.mockResolvedValue({...savedSettings, endMinute: savedSettings.startMinute});
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy());
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        expect(screen.getByTestId('out_of_office_settings.error')).toHaveTextContent('Choose different start and end times for quiet hours.');
        expect(save).not.toHaveBeenCalled();
    });

    it('should save all-day days off without quiet hours', async () => {
        load.mockResolvedValue({...savedSettings, quietHoursEnabled: false, startMinute: 0, endMinute: 0, daysOff: [0]});
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy());
        expect(screen.queryByTestId('out_of_office_settings.start')).toBeNull();
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), {...savedSettings, quietHoursEnabled: false, startMinute: 0, endMinute: 0, daysOff: [0]}));
    });

    it('should reject an enabled schedule with no hours or days off', async () => {
        load.mockResolvedValue({...savedSettings, quietHoursEnabled: false});
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy());
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        expect(screen.getByTestId('out_of_office_settings.error')).toHaveTextContent('Enable daily quiet hours or select at least one day off.');
        expect(save).not.toHaveBeenCalled();
    });

    it('should preserve a legacy schedule until explicit replacement', async () => {
        load.mockResolvedValue({enabled: true, startAt: 1, endAt: Date.now() + 3600000, allowCalls: true, allowMentions: false});
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.legacy')).toBeTruthy());
        expect(screen.getByTestId('out_of_office_settings.enable.toggled.false.button')).toBeTruthy();
        expect(save).not.toHaveBeenCalled();
        fireEvent(screen.getByTestId('out_of_office_settings.enable.toggled.false.button'), 'valueChange', true);
        expect(screen.getByTestId('out_of_office_settings.allow_calls.toggled.true.button')).toBeTruthy();
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), {...savedSettings, allowCalls: true}));
    });

    it('should show save errors and preserve the schedule for retry', async () => {
        save.mockRejectedValue(new Error('Storage unavailable'));
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy());
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.error')).toHaveTextContent('Unable to save your out of office settings. Please try again.'));
        expect(screen.getByTestId('out_of_office_settings.enable.toggled.true.button')).toBeTruthy();
        expect(screen.getByTestId('out_of_office_settings.allow_calls.toggled.false.button')).toBeTruthy();
    });

    it('should prevent overwriting settings after a load failure', async () => {
        load.mockRejectedValue(new Error('Storage unavailable'));
        const screen = renderWithIntlAndTheme(<OutOfOffice/>);
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.error')).toHaveTextContent('Unable to load your out of office settings. Go back and try again.'));
        expect(screen.getByTestId('out_of_office_settings.save')).toBeDisabled();
        expect(save).not.toHaveBeenCalled();
    });
});

// The real DateTimePickerAndroid bridge converts these native dialog results into callbacks.
const nativeTimePicker = require('@react-native-community/datetimepicker/src/specs/NativeModuleTimePicker') as {
    open: jest.Mock<Promise<{action: string; timestamp?: number; utcOffset?: number}>, [{value: number; timeZoneName?: string}]>;
};

describe('Android out of office wall clock editing', () => {
    let load: jest.SpyInstance;
    let save: jest.SpyInstance;

    const form = (locale = 'en') => (
        <IntlProvider
            locale={locale}
            timeZone='UTC'
            messages={English}
        >
            <OutOfOffice/>
        </IntlProvider>
    );

    beforeEach(() => {
        jest.spyOn(Timezone, 'getDeviceTimezone').mockReturnValue('Asia/Tehran');
        jest.replaceProperty(Platform, 'OS', 'android');
        load = jest.spyOn(OutOfOfficeSettings, 'getOutOfOfficeSettings').mockResolvedValue(savedSettings);
        save = jest.spyOn(OutOfOfficeSettings, 'saveOutOfOfficeSettings').mockResolvedValue();
        nativeTimePicker.open.mockReset();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should display local hours and persist independent Android selections across reopening', async () => {
        const screen = renderWithIntlAndTheme(form());
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 6:00\s*PM/));
        expect(screen.getByTestId('out_of_office_settings.end')).toHaveTextContent(/Ends: 9:00\s*AM/);
        expect(screen.getByText('Sunday')).toBeTruthy();
        nativeTimePicker.open.mockResolvedValueOnce({action: 'timeSetAction', timestamp: new Date(2024, 0, 15, 19, 45).getTime(), utcOffset: 210});
        fireEvent.press(screen.getByTestId('out_of_office_settings.start'));
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 7:45\s*PM/));
        expect(nativeTimePicker.open).toHaveBeenLastCalledWith(expect.objectContaining({timeZoneName: 'Asia/Tehran'}));
        expect(screen.getByTestId('out_of_office_settings.end')).toHaveTextContent(/Ends: 9:00\s*AM/);
        nativeTimePicker.open.mockResolvedValueOnce({action: 'timeSetAction', timestamp: new Date(2024, 0, 15, 8, 15).getTime(), utcOffset: 210});
        fireEvent.press(screen.getByTestId('out_of_office_settings.end'));
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.end')).toHaveTextContent(/Ends: 8:15\s*AM/));
        expect(screen.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 7:45\s*PM/);
        expect(nativeTimePicker.open).toHaveBeenCalledTimes(2);
        const updated = {...savedSettings, startMinute: 1185, endMinute: 495};
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), updated));
        screen.unmount();
        load.mockResolvedValue(updated);
        const reopened = renderWithIntlAndTheme(form());
        await waitFor(() => expect(reopened.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 7:45\s*PM/));
        expect(reopened.getByTestId('out_of_office_settings.end')).toHaveTextContent(/Ends: 8:15\s*AM/);
    });

    it('should keep values when the Android dialog is cancelled', async () => {
        const screen = renderWithIntlAndTheme(form());
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 6:00\s*PM/));
        nativeTimePicker.open.mockResolvedValueOnce({action: 'dismissedAction'});
        fireEvent.press(screen.getByTestId('out_of_office_settings.start'));
        await waitFor(() => expect(nativeTimePicker.open).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 6:00\s*PM/);
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), savedSettings));
    });

    it('should keep unsaved times when the locale changes', async () => {
        const screen = renderWithIntlAndTheme(form());
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.start')).toBeTruthy());
        nativeTimePicker.open.mockResolvedValueOnce({action: 'timeSetAction', timestamp: new Date(2024, 0, 15, 19, 45).getTime(), utcOffset: 210});
        fireEvent.press(screen.getByTestId('out_of_office_settings.start'));
        await waitFor(() => expect(screen.getByTestId('out_of_office_settings.start')).toHaveTextContent(/Starts: 7:45\s*PM/));
        screen.rerender(form('en-GB'));
        expect(load).toHaveBeenCalledTimes(1);
        fireEvent.press(screen.getByTestId('out_of_office_settings.save'));
        await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(String), {...savedSettings, startMinute: 1185}));
    });
});
