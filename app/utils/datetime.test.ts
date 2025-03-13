// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getReadableTimestamp, isSameDate, isSameMonth, isSameYear, isToday, isYesterday} from './datetime';

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
