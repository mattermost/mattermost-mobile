// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mtz from 'moment-timezone';

import {getFormattedTime} from './time';

describe('getFormattedTime', () => {
    beforeAll(() => {
        mtz.tz.setDefault('UTC');
    });

    afterAll(() => {
        mtz.tz.setDefault();
    });

    test('returns time in military format', () => {
        const result = getFormattedTime(true, 'America/New_York', '2025-03-31T12:00:00Z');
        expect(result).toBe('8:00');
    });

    test('returns time in 12-hour format with AM/PM', () => {
        const result = getFormattedTime(false, 'America/New_York', '2025-03-31T12:00:00Z');
        expect(result).toBe('8:00 AM');
    });

    test('handles UserTimezone object with automaticTimezone', () => {
        const timezone = {useAutomaticTimezone: true, automaticTimezone: 'Asia/Tokyo', manualTimezone: 'America/Los_Angeles'};
        const result = getFormattedTime(false, timezone, '2025-03-31T12:00:00Z');
        expect(result).toBe('9:00 PM');
    });

    test('handles UserTimezone object with manualTimezone', () => {
        const timezone = {useAutomaticTimezone: false, automaticTimezone: 'Asia/Tokyo', manualTimezone: 'America/Los_Angeles'};
        const result = getFormattedTime(false, timezone, '2025-03-31T12:00:00Z');
        expect(result).toBe('5:00 AM');
    });

    test('uses local time when timezone is undefined', () => {
        const result = getFormattedTime(false, '', '2025-03-31T12:00:00Z');
        expect(result).toBe(mtz('2025-03-31T12:00:00Z').format('h:mm A'));
    });
});
