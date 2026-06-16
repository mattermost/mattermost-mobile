// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment-timezone';

import {getCurrentMomentForTimezone} from './helpers';
import {logWarning} from './log';

/**
 * Date reference constants for relative dates
 */
enum DateReference {
    TODAY = 'today',
    TOMORROW = 'tomorrow',
    YESTERDAY = 'yesterday',
}

/**
 * Resolves relative date expressions to date or datetime strings
 * Supports:
 * - Named references: "today", "tomorrow", "yesterday"
 * - Date offsets: "+5d", "-3d", "+2w", "+1m" (days, weeks, months) → YYYY-MM-DD
 * - Time offsets: "+2H", "+30M", "+90S" (hours, minutes, seconds) → ISO 8601 datetime
 *
 * @param dateStr - The date string to resolve (can be relative or absolute)
 * @param timezone - Optional timezone for "today" reference (defaults to UTC)
 * @returns ISO date string (YYYY-MM-DD) for date offsets, ISO 8601 datetime for time offsets, or original string if not relative
 *
 * @example
 * resolveRelativeDate("today") // "2026-01-15"
 * resolveRelativeDate("+5d") // "2026-01-20"
 * resolveRelativeDate("+2H") // "2026-01-15T14:00:00Z"
 * resolveRelativeDate("+30M") // "2026-01-15T12:30:00Z"
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
            return now.clone().startOf('day').format('YYYY-MM-DD');
        case DateReference.TOMORROW:
            return now.clone().add(1, 'day').startOf('day').format('YYYY-MM-DD');
        case DateReference.YESTERDAY:
            return now.clone().subtract(1, 'day').startOf('day').format('YYYY-MM-DD');
    }

    // Handle dynamic offset patterns: +5d, -3d, +2w, +1m, +2H, +30M, +90S
    const match = dateStr.match(/^([+-]\d{1,4})([dwmHMS])$/);
    if (match) {
        const [, amount, unit] = match;
        const value = parseInt(amount, 10);

        // Time units (uppercase): return full ISO datetime
        // Note: uppercase M = minutes, lowercase m = months (case-sensitive)
        const timeUnitMap: {[key: string]: moment.unitOfTime.DurationConstructor} = {
            H: 'hour',
            M: 'minute',
            S: 'second',
        };
        if (unit in timeUnitMap) {
            if (unit === 'M') {
                logWarning('[resolveRelativeDate]', `"${dateStr}" resolved as ${value} minute(s). Use lowercase "m" for months.`);
            }
            return now.clone().add(value, timeUnitMap[unit]).toISOString();
        }

        // Date units (lowercase): return date-only string
        const dateUnitMap: {[key: string]: moment.unitOfTime.DurationConstructor} = {
            d: 'day',
            w: 'week',
            m: 'month',
        };
        return now.clone().add(value, dateUnitMap[unit]).startOf('day').format('YYYY-MM-DD');
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

    return /^[+-]\d{1,4}[dwmHMS]$/.test(dateStr);
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
        // For date-only strings, parse in the specified timezone at midnight
        // to avoid off-by-one errors from device/UTC timezone mismatch
        const parsed = timezone ? moment.tz(value, 'YYYY-MM-DD', timezone) : moment(value, 'YYYY-MM-DD');
        return parsed.isValid() ? parsed : null;
    }

    // For datetime strings, use timezone
    const parsed = timezone ? moment.tz(value, timezone) : moment(value);
    return parsed.isValid() ? parsed : null;
}

export const isTimeOffset = (dateStr: string): boolean => /^[+-]\d{1,4}[HMS]$/.test(dateStr);

export const getDateValue = (value: AppFormValue, timezone?: string, isDateTime = false): Moment | undefined => {
    if (typeof value === 'string' && value) {
        // Resolve relative dates FIRST (today, +1d, etc.)
        const resolvedValue = resolveRelativeDate(value, timezone);

        // Then parse the resolved date
        const parsed = parseDateInTimezone(resolvedValue, timezone);

        // For datetime fields with date-only relative values (today, +1d, +2w),
        // set the time to current time. Skip for time offsets (+2H, +30M, +90S)
        // which already have the correct timestamp from resolveRelativeDate.
        if (isDateTime && parsed && value !== resolvedValue && !isTimeOffset(value)) {
            const currentTime = getCurrentMomentForTimezone(timezone || null);
            return parsed.clone().hour(currentTime.hour()).minute(currentTime.minute()).second(0);
        }

        return parsed || undefined;
    }
    return undefined;
};
