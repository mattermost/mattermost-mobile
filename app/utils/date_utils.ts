// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {getCurrentMomentForTimezone} from './helpers';

/**
 * Date reference constants for relative dates
 */
enum DateReference {
    TODAY = 'today',
    TOMORROW = 'tomorrow',
    YESTERDAY = 'yesterday',
}

/**
 * Resolves relative date expressions to ISO date strings
 * Supports:
 * - Named references: "today", "tomorrow", "yesterday"
 * - Dynamic offsets: "+5d", "-3d", "+2w", "+1m" (days, weeks, months)
 *
 * @param dateStr - The date string to resolve (can be relative or absolute)
 * @param timezone - Optional timezone for "today" reference (defaults to UTC)
 * @returns ISO date string (YYYY-MM-DD) or original string if not relative
 *
 * @example
 * resolveRelativeDate("today") // "2026-01-15"
 * resolveRelativeDate("+5d") // "2026-01-20"
 * resolveRelativeDate("-2w") // "2026-01-01"
 * resolveRelativeDate("2026-01-15") // "2026-01-15" (unchanged)
 */
export function resolveRelativeDate(dateStr: string, timezone?: string): string {
    if (!dateStr) {
        return dateStr;
    }

    const now = timezone ? getCurrentMomentForTimezone(timezone) : moment.utc();

    // Handle named date references
    switch (dateStr.toLowerCase()) {
        case DateReference.TODAY:
            return now.startOf('day').format('YYYY-MM-DD');
        case DateReference.TOMORROW:
            return now.add(1, 'day').startOf('day').format('YYYY-MM-DD');
        case DateReference.YESTERDAY:
            return now.subtract(1, 'day').startOf('day').format('YYYY-MM-DD');
    }

    // Handle dynamic offset patterns: +5d, -3d, +2w, +1m
    const match = dateStr.match(/^([+-]\d{1,4})([dwm])$/i);
    if (match) {
        const [, amount, unit] = match;
        const value = parseInt(amount, 10);
        const unitMap: {[key: string]: moment.unitOfTime.DurationConstructor} = {
            d: 'day',
            w: 'week',
            m: 'month',
        };
        return now.add(value, unitMap[unit.toLowerCase()]).startOf('day').format('YYYY-MM-DD');
    }

    // Not a relative date, return as-is
    return dateStr;
}

/**
 * Checks if a string is a relative date expression
 */
export function isRelativeDate(dateStr: string): boolean {
    if (!dateStr) {
        return false;
    }

    const lower = dateStr.toLowerCase();
    if ([DateReference.TODAY, DateReference.TOMORROW, DateReference.YESTERDAY].includes(lower as DateReference)) {
        return true;
    }

    return /^[+-]\d{1,4}[dwm]$/i.test(dateStr);
}

/**
 * Parses a date string with proper timezone handling
 * For date-only strings (YYYY-MM-DD), parses in the specified timezone
 * For datetime strings with time/UTC indicator, parses as UTC then converts
 *
 * @param value - Date string to parse
 * @param timezone - IANA timezone to use for date-only strings
 * @returns Moment object or null if invalid
 *
 * @example
 * parseDateInTimezone("2026-01-15", "America/New_York") // Parsed as midnight in New York
 * parseDateInTimezone("2026-01-15T14:30:00Z", "America/New_York") // Parsed as UTC, displayed in New York
 */
export function parseDateInTimezone(value: string | null | undefined, timezone?: string | null | undefined): moment.Moment | null {
    if (!value) {
        return null;
    }

    // Check if this is a date-only string (YYYY-MM-DD format)
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    const isDateOnly = dateOnlyPattern.test(value);

    if (isDateOnly) {
        // For date-only strings, parse WITHOUT timezone conversion
        // Use local time to avoid off-by-one errors from UTC conversion
        const parsed = moment(value, 'YYYY-MM-DD');
        return parsed.isValid() ? parsed : null;
    }

    // For datetime strings, use timezone
    const parsed = timezone ? moment.tz(value, timezone) : moment(value);
    return parsed.isValid() ? parsed : null;
}
