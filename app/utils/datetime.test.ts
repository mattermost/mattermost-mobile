// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getIntlShape} from '@utils/general';

import {formatTime, getReadableTimestamp, isSameDate, isSameMonth, isSameYear, isToday, isYesterday} from './datetime';

describe('Datetime', () => {
    test('isSameDate (isSameMonth / isSameYear)', () => {
        expect(isSameDate(new Date('2024-03-28 02:23:27'), new Date('2025-03-28 02:23:27'))).toBe(false);
        expect(isSameDate(new Date('2024-03-28 02:23:27'), new Date('2024-02-28 02:23:27'))).toBe(false);
        expect(isSameDate(new Date('2024-03-28 02:23:27'), new Date('2024-03-18 02:23:27'))).toBe(false);
        expect(isSameDate(new Date('2024-03-28 02:23:27'), new Date('2024-03-28 00:00:00'))).toBe(true);
        expect(isSameDate(new Date('2024-03-28 02:23:27'))).toBe(false);
        expect(isSameDate(new Date())).toBe(true);
    });

    test('isSameMonth with default', () => {
        expect(isSameMonth(new Date('2024-03-28 02:23:27'))).toBe(false);
        expect(isSameMonth(new Date())).toBe(true);
    });

    test('isSameYear with default', () => {
        expect(isSameYear(new Date('2022-03-28 02:23:27'))).toBe(false);
        expect(isSameYear(new Date())).toBe(true);
    });

    test('isToday', () => {
        expect(isToday(new Date('2024-03-28 02:23:27'))).toBe(false);
        expect(isToday(new Date())).toBe(true);
    });

    test('isYesteday', () => {
        expect(isYesterday(new Date('2024-03-28 02:23:27'))).toBe(false);
        const today = new Date();
        today.setDate(today.getDate() - 1);
        expect(isYesterday(today)).toBe(true);
    });
});

describe('getReadableTimestamp', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should format timestamp correctly in 12-hour format for current year', () => {
        const timestamp = new Date('2025-06-15T12:00:00Z').getTime();
        const timeZone = 'America/New_York';
        const result = getReadableTimestamp(timestamp, timeZone, false, 'en-US');
        expect(result).toBe('Jun 15, 8:00 AM');
    });

    it('should format timestamp correctly in 24-hour format for current year', () => {
        const timestamp = new Date('2025-06-15T12:00:00Z').getTime();
        const timeZone = 'America/New_York';
        const result = getReadableTimestamp(timestamp, timeZone, true, 'en-US');
        expect(result).toBe('Jun 15, 08:00');
    });

    it('should include year if not current year', () => {
        const timestamp = new Date('2024-06-15T12:00:00Z').getTime();
        const timeZone = 'America/New_York';
        const result = getReadableTimestamp(timestamp, timeZone, false, 'en-US');
        expect(result).toBe('Jun 15, 2024, 8:00 AM');
    });

    it('should include year if not current year in 24-hour format', () => {
        const timestamp = new Date('2024-06-15T12:00:00Z').getTime();
        const timeZone = 'America/New_York';
        const result = getReadableTimestamp(timestamp, timeZone, true, 'en-US');
        expect(result).toBe('Jun 15, 2024, 08:00');
    });

    it('should format timestamp correctly for different locales', () => {
        const timestamp = new Date('2025-06-15T12:00:00Z').getTime();
        const timeZone = 'America/New_York';

        const frResult = getReadableTimestamp(timestamp, timeZone, false, 'fr-FR');
        expect(frResult).toBe('15 juin, 8:00 AM');

        const deResult = getReadableTimestamp(timestamp, timeZone, false, 'de-DE');
        expect(deResult).toBe('15. Juni, 8:00 AM');
    });
});

describe('formatTime', () => {
    it('should format seconds only', () => {
        expect(formatTime(30)).toBe('0:30');
        expect(formatTime(5)).toBe('0:05');
        expect(formatTime(59)).toBe('0:59');
    });

    it('should format minutes and seconds', () => {
        expect(formatTime(90)).toBe('1:30');
        expect(formatTime(125)).toBe('2:05');
        expect(formatTime(3599)).toBe('59:59');
    });

    it('should format hours, minutes, and seconds', () => {
        expect(formatTime(3600)).toBe('1:00:00');
        expect(formatTime(3661)).toBe('1:01:01');
        expect(formatTime(7325)).toBe('2:02:05');
        expect(formatTime(36000)).toBe('10:00:00');
    });

    it('should handle zero seconds', () => {
        expect(formatTime(0)).toBe('0:00');
    });

    it('should handle negative values by treating them as zero', () => {
        expect(formatTime(-30)).toBe('0:00');
        expect(formatTime(-3600)).toBe('0:00');
    });

    it('should pad minutes with zero when hours are present', () => {
        expect(formatTime(3605)).toBe('1:00:05');
        expect(formatTime(3665)).toBe('1:01:05');
    });

    it('should not pad minutes with zero when no hours', () => {
        expect(formatTime(65)).toBe('1:05');
        expect(formatTime(605)).toBe('10:05');
    });

    describe('text time format', () => {
        const intl = getIntlShape();

        it('should format seconds only in text time format', () => {
            expect(formatTime(30, true, intl)).toBe('30s');
            expect(formatTime(5, true, intl)).toBe('5s');
            expect(formatTime(59, true, intl)).toBe('59s');
        });

        it('should format minutes and seconds in text time format', () => {
            expect(formatTime(90, true, intl)).toBe('1m 30s');
            expect(formatTime(125, true, intl)).toBe('2m 5s');
            expect(formatTime(3599, true, intl)).toBe('59m 59s');
        });

        it('should format hours, minutes, and seconds in text time format', () => {
            expect(formatTime(3600, true, intl)).toBe('1h');
            expect(formatTime(3661, true, intl)).toBe('1h 1m 1s');
            expect(formatTime(7325, true, intl)).toBe('2h 2m 5s');
            expect(formatTime(36000, true, intl)).toBe('10h');
        });

        it('should format hours and minutes only in text time format', () => {
            expect(formatTime(3660, true, intl)).toBe('1h 1m');
            expect(formatTime(7200, true, intl)).toBe('2h');
        });

        it('should format hours and seconds only in text time format', () => {
            expect(formatTime(3605, true, intl)).toBe('1h 5s');
        });

        it('should format minutes only in text time format', () => {
            expect(formatTime(60, true, intl)).toBe('1m');
            expect(formatTime(120, true, intl)).toBe('2m');
        });

        it('should handle zero seconds in text time format', () => {
            expect(formatTime(0, true, intl)).toBe('0s');
        });

        it('should handle negative values in text time format', () => {
            expect(formatTime(-30, true, intl)).toBe('0s');
            expect(formatTime(-3600, true, intl)).toBe('0s');
        });
    });
});
