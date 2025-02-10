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
    test('should return a formatted timestamp string', () => {
        const timestamp = 1625094000000;
        const expected = 'Jul 1 at 4:30 AM';
        expect(getReadableTimestamp(timestamp)).toBe(expected);
    });
});
