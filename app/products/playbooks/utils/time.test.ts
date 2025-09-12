// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';

import {toMilliseconds} from '@utils/datetime';

import {getDueDateString} from './time';

describe('getDueDateString', () => {
    const mockIntl = createIntl({
        locale: 'en-US',
        messages: {
            'playbooks.due_date.none': 'None',
            'playbooks.due_date.date_at_time': '{date} at {time}',
        },
    });

    describe('when dueDate is undefined', () => {
        it('should return "None" message', () => {
            const result = getDueDateString(mockIntl, undefined, 'America/New_York');
            expect(result).toBe('None');
        });
    });

    describe('when dueDate is 0', () => {
        it('should return "None" message', () => {
            const result = getDueDateString(mockIntl, 0, 'America/New_York');
            expect(result).toBe('None');
        });
    });

    describe('when dueDate is valid and more than 1 day away', () => {
        it('should return date only without time', () => {
            const futureDate = Date.now() + toMilliseconds({days: 2});
            const result = getDueDateString(mockIntl, futureDate, 'America/New_York');

            // Should not contain "at" since time is not shown
            expect(result).not.toContain(' at ');
            expect(result).toMatch(/^\w+, \w+ \d+$/); // Format: "Monday, January 15"
        });
    });

    describe('when dueDate is within 1 day', () => {
        it('should return date with time', () => {
            const nearDate = Date.now() + toMilliseconds({hours: 12});
            const result = getDueDateString(mockIntl, nearDate, 'America/New_York');

            expect(result).toContain(' at ');
            expect(result).toMatch(/^\w+, \w+ \d+ at \d{2}:\d{2} [AP]M$/); // Format: "Monday, January 15 at 14:30"
        });

        it('should use the provided timezone for time formatting', () => {
            const nearDate = Date.now() + toMilliseconds({hours: 12});
            const resultNY = getDueDateString(mockIntl, nearDate, 'America/New_York');
            const resultLA = getDueDateString(mockIntl, nearDate, 'America/Los_Angeles');

            // Times should be different due to different timezones
            expect(resultNY).not.toBe(resultLA);
        });
    });

    describe('when showAlwaysTime is true', () => {
        it('should always show time even for dates more than 1 day away', () => {
            const futureDate = Date.now() + toMilliseconds({days: 2});
            const result = getDueDateString(mockIntl, futureDate, 'America/New_York', true);

            expect(result).toContain(' at ');
            expect(result).toMatch(/^\w+, \w+ \d+ at \d{2}:\d{2} [AP]M$/);
        });

        it('should show time for dates within 1 day when showAlwaysTime is true', () => {
            const nearDate = Date.now() + toMilliseconds({hours: 12});
            const result = getDueDateString(mockIntl, nearDate, 'America/New_York', true);

            expect(result).toContain(' at ');
            expect(result).toMatch(/^\w+, \w+ \d+ at \d{2}:\d{2} [AP]M$/);
        });
    });

    describe('edge cases', () => {
        it('should handle dates in the past', () => {
            const pastDate = Date.now() - toMilliseconds({hours: 12});
            const result = getDueDateString(mockIntl, pastDate, 'America/New_York');

            // Should show time since it's within 1 day (in the past)
            expect(result).toContain(' at ');
        });

        it('should handle different timezone formats', () => {
            const nearDate = Date.now() + toMilliseconds({hours: 12});
            const resultUTC = getDueDateString(mockIntl, nearDate, 'UTC');
            const resultEST = getDueDateString(mockIntl, nearDate, 'America/New_York');

            expect(resultUTC).not.toBe(resultEST);
        });
    });
});
