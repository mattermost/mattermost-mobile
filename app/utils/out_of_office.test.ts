// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils/src';
import {DeviceEventEmitter} from 'react-native';

import {
    getOutOfOfficeSettings,
    getNextOutOfOfficeCheck,
    isOutOfOfficeActive,
    OUT_OF_OFFICE_CHANGED,
    saveOutOfOfficeSettings,
    shouldSuppressOutOfOfficeNotification,
    suppressNotificationDuringOutOfOffice,
    type OutOfOfficeSettings,
    type WeeklyOutOfOfficeSettings,
} from './out_of_office';

const settings: OutOfOfficeSettings = {
    enabled: true,
    startAt: 1000,
    endAt: 2000,
    allowCalls: false,
    allowMentions: false,
};
const serverUrl = 'https://community.mattermost.com';

const weeklySettings: WeeklyOutOfOfficeSettings = {
    schedule: 'weekly',
    enabled: true,
    quietHoursEnabled: true,
    startMinute: 22 * 60,
    endMinute: 7 * 60,
    daysOff: [],
    allowCalls: false,
    allowMentions: false,
};

// Construct local dates rather than ISO UTC dates: schedules follow the device clock.
const localTime = (hour: number, minute = 0, day = 16) => new Date(2026, 10, day, hour, minute).getTime();

describe('recurring quiet periods', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should observe both boundaries of daytime quiet hours', () => {
        const daytime = {...weeklySettings, startMinute: 9 * 60, endMinute: 17 * 60};
        expect(isOutOfOfficeActive(daytime, localTime(8, 59))).toBe(false);
        expect(isOutOfOfficeActive(daytime, localTime(9))).toBe(true);
        expect(isOutOfOfficeActive(daytime, localTime(16, 59))).toBe(true);
        expect(isOutOfOfficeActive(daytime, localTime(17))).toBe(false);
    });

    it('should repeat overnight hours on both sides of midnight', () => {
        expect(isOutOfOfficeActive(weeklySettings, localTime(21, 59))).toBe(false);
        expect(isOutOfOfficeActive(weeklySettings, localTime(22))).toBe(true);
        expect(isOutOfOfficeActive(weeklySettings, localTime(0, 0, 17))).toBe(true);
        expect(isOutOfOfficeActive(weeklySettings, localTime(6, 59, 17))).toBe(true);
        expect(isOutOfOfficeActive(weeklySettings, localTime(7, 0, 17))).toBe(false);
    });

    it('should apply a selected weekday for its full local day without quiet hours', () => {
        const tuesdayOff = {...weeklySettings, quietHoursEnabled: false, daysOff: [2]};
        expect(isOutOfOfficeActive(tuesdayOff, localTime(23, 59))).toBe(false);
        expect(isOutOfOfficeActive(tuesdayOff, localTime(0, 0, 17))).toBe(true);
        expect(isOutOfOfficeActive(tuesdayOff, localTime(23, 59, 17))).toBe(true);
        expect(isOutOfOfficeActive(tuesdayOff, localTime(0, 0, 18))).toBe(false);
    });

    it('should combine full days off with daily quiet hours and repeat indefinitely', () => {
        const combined = {...weeklySettings, daysOff: [2]};
        expect(isOutOfOfficeActive(combined, localTime(12, 0, 17))).toBe(true);
        expect(isOutOfOfficeActive(combined, localTime(12, 0, 18))).toBe(false);
        expect(isOutOfOfficeActive(combined, new Date(2028, 5, 14, 23).getTime())).toBe(true);
    });

    it('should apply independent notification exceptions throughout recurring quiet time', () => {
        const allowMentions = {...weeklySettings, allowMentions: true};
        expect(shouldSuppressOutOfOfficeNotification(allowMentions, 'message', true, localTime(23))).toBe(false);
        expect(shouldSuppressOutOfOfficeNotification(allowMentions, 'message', false, localTime(23))).toBe(true);
        expect(shouldSuppressOutOfOfficeNotification(allowMentions, 'call', true, localTime(23))).toBe(true);
        expect(shouldSuppressOutOfOfficeNotification({...weeklySettings, allowCalls: true}, 'call', false, localTime(23))).toBe(false);
    });

    it('should not suppress notifications for an invalid equal-time schedule even on a day off', async () => {
        const invalid = {...weeklySettings, startMinute: 60, endMinute: 60, daysOff: [2]};
        expect(isOutOfOfficeActive(invalid, localTime(12, 0, 17))).toBe(false);
        await expect(saveOutOfOfficeSettings(serverUrl, invalid)).rejects.toThrow();
        expect(RNUtils.setOutOfOfficeSettings).not.toHaveBeenCalled();
    });

    it('should reject an enabled recurring schedule with no quiet period', async () => {
        await expect(saveOutOfOfficeSettings(serverUrl, {...weeklySettings, quietHoursEnabled: false})).rejects.toThrow();
        expect(RNUtils.setOutOfOfficeSettings).not.toHaveBeenCalled();
    });

    it('should persist recurring settings and restore full-day-only schedules', async () => {
        const fullDays = {...weeklySettings, quietHoursEnabled: false, startMinute: 0, endMinute: 0, daysOff: [5, 6]};
        await saveOutOfOfficeSettings(serverUrl, fullDays);
        const saved = jest.mocked(RNUtils.setOutOfOfficeSettings).mock.calls[0][1];
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValueOnce(saved);
        await expect(getOutOfOfficeSettings(serverUrl)).resolves.toEqual(fullDays);
    });

    it.each([
        {startMinute: -1}, {endMinute: 1440}, {startMinute: 1.5},
        {daysOff: [7]}, {daysOff: [-1]}, {daysOff: [2.5]},
        {daysOff: ['2']}, {daysOff: null}, {quietHoursEnabled: 'true'}, {schedule: 'unsupported'},
    ])('should reject malformed recurring settings %p', async (invalid) => {
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValueOnce(JSON.stringify({...weeklySettings, ...invalid}));
        await expect(getOutOfOfficeSettings(serverUrl)).rejects.toThrow('Invalid out-of-office settings');
    });

    it('should recheck recurring schedules at the next minute and preserve legacy boundaries', () => {
        const now = localTime(21, 59) + 45000;
        expect(getNextOutOfOfficeCheck(weeklySettings, now)).toBe(localTime(22));
        expect(getNextOutOfOfficeCheck(weeklySettings, localTime(22))).toBe(localTime(22, 1));
        expect(getNextOutOfOfficeCheck({...weeklySettings, enabled: false}, now)).toBeUndefined();
        expect(getNextOutOfOfficeCheck(settings, 500)).toBe(1000);
        expect(getNextOutOfOfficeCheck(settings, 1500)).toBe(2000);
        expect(getNextOutOfOfficeCheck(settings, 2000)).toBeUndefined();
    });
});

describe('out-of-office notification policy', () => {
    it('should start at the scheduled instant and resume notifications at the end', () => {
        expect(isOutOfOfficeActive(settings, 999)).toBe(false);
        expect(isOutOfOfficeActive(settings, 1000)).toBe(true);
        expect(isOutOfOfficeActive(settings, 2000)).toBe(false);
        expect(shouldSuppressOutOfOfficeNotification(settings, 'message', false, 2000)).toBe(false);
    });

    it('should deliver notifications when disabled or unconfigured', () => {
        expect(shouldSuppressOutOfOfficeNotification(undefined, 'message', false, 1500)).toBe(false);
        expect(shouldSuppressOutOfOfficeNotification({...settings, enabled: false}, 'call', false, 1500)).toBe(false);
    });

    it('should suppress messages, mentions, and calls by default', () => {
        expect(shouldSuppressOutOfOfficeNotification(settings, 'message', false, 1500)).toBe(true);
        expect(shouldSuppressOutOfOfficeNotification(settings, 'message', true, 1500)).toBe(true);
        expect(shouldSuppressOutOfOfficeNotification(settings, 'call', false, 1500)).toBe(true);
    });

    it('should allow calls without also allowing mentions or ordinary messages', () => {
        const allowCalls = {...settings, allowCalls: true};
        expect(shouldSuppressOutOfOfficeNotification(allowCalls, 'call', false, 1500)).toBe(false);
        expect(shouldSuppressOutOfOfficeNotification(allowCalls, 'message', true, 1500)).toBe(true);
    });

    it('should allow mentions without allowing ordinary messages or calls', () => {
        const allowMentions = {...settings, allowMentions: true};
        expect(shouldSuppressOutOfOfficeNotification(allowMentions, 'message', true, 1500)).toBe(false);
        expect(shouldSuppressOutOfOfficeNotification(allowMentions, 'message', false, 1500)).toBe(true);
        expect(shouldSuppressOutOfOfficeNotification(allowMentions, 'call', true, 1500)).toBe(true);
    });
});

describe('out-of-office persistence', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should reject invalid schedules before writing settings', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(500);
        const invalidSettings = [
            {...settings, endAt: settings.startAt},
            {...settings, endAt: 400},
            {...settings, startAt: Number.NaN},
        ];
        await Promise.all(invalidSettings.map(async (invalid) => {
            await expect(saveOutOfOfficeSettings(serverUrl, invalid)).rejects.toThrow();
        }));
        expect(RNUtils.setOutOfOfficeSettings).not.toHaveBeenCalled();
    });

    it('should notify settings listeners only after the native write succeeds', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(500);
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(OUT_OF_OFFICE_CHANGED, listener);
        try {
            jest.mocked(RNUtils.setOutOfOfficeSettings).mockRejectedValueOnce(new Error('Write failed'));
            await expect(saveOutOfOfficeSettings(serverUrl, settings)).rejects.toThrow('Write failed');
            expect(listener).not.toHaveBeenCalled();

            await saveOutOfOfficeSettings(serverUrl, settings);
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(serverUrl);
            expect(RNUtils.setOutOfOfficeSettings).toHaveBeenLastCalledWith(serverUrl, JSON.stringify(settings));
        } finally {
            subscription.remove();
        }
    });

    it('should read the policy for the requested server', async () => {
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValueOnce(JSON.stringify(settings));
        await expect(getOutOfOfficeSettings(serverUrl)).resolves.toEqual(settings);
        expect(RNUtils.getOutOfOfficeSettings).toHaveBeenCalledWith(serverUrl);
    });

    it('should allow disabling a schedule after it has expired', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(3000);
        const disabled = {...settings, enabled: false};
        await expect(saveOutOfOfficeSettings(serverUrl, disabled)).resolves.toBeUndefined();
        expect(RNUtils.setOutOfOfficeSettings).toHaveBeenCalledWith(serverUrl, JSON.stringify(disabled));
    });

    it('should reject malformed stored policies and preserve delivery', async () => {
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValueOnce('{invalid');
        await expect(getOutOfOfficeSettings(serverUrl)).rejects.toThrow('Invalid out-of-office settings');

        jest.mocked(RNUtils.getOutOfOfficeSettings).mockResolvedValueOnce(JSON.stringify({enabled: true}));
        await expect(suppressNotificationDuringOutOfOffice(serverUrl, 'message')).resolves.toBe(false);
    });

    it('should preserve notification delivery when native storage fails', async () => {
        jest.mocked(RNUtils.getOutOfOfficeSettings).mockRejectedValueOnce(new Error('Storage unavailable'));
        await expect(suppressNotificationDuringOutOfOffice(serverUrl, 'call')).resolves.toBe(false);
    });
});
