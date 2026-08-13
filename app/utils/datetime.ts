// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {Platform} from 'react-native';

import type {IntlShape} from 'react-intl';

export type ValidMinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

const IOS_VALID_INTERVALS = new Set<ValidMinuteInterval>([1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30]);

export function toValidMinuteInterval(interval?: number): ValidMinuteInterval {
    if (Platform.OS !== 'ios') {
        // Android doesn't use minuteInterval — return 30 as a no-op default
        return 30;
    }
    if (interval && IOS_VALID_INTERVALS.has(interval as ValidMinuteInterval)) {
        return interval as ValidMinuteInterval;
    }

    // iOS doesn't support 60+ — clamp to 30
    return 30;
}

/**
 * Parses flexible time string input into hours and minutes.
 * Supports: "13:40", "1:30pm", "1:30 PM", "2pm", "14:00", etc.
 */
export function parseTimeString(input: string): {hours: number; minutes: number} | null {
    const trimmed = input.trim();

    const formats = [
        'H:mm', // 0:00 - 23:59
        'HH:mm',
        'h:mm A', // 2:30 PM
        'h:mma', // 2:30pm
        'ha', // 2pm
        'h A', // 2 PM
    ];

    const m = moment(trimmed, formats, true);

    if (!m.isValid()) {
        return null;
    }

    return {
        hours: m.hour(),
        minutes: m.minute(),
    };
}

export function isSameDate(a: Date, b: Date = new Date()): boolean {
    return a.getDate() === b.getDate() && isSameMonth(a, b) && isSameYear(a, b);
}

export function isSameMonth(a: Date, b: Date = new Date()): boolean {
    return a.getMonth() === b.getMonth() && isSameYear(a, b);
}

export function isSameYear(a: Date, b: Date = new Date()): boolean {
    return a.getFullYear() === b.getFullYear();
}

export function isToday(date: Date) {
    const now = new Date();

    return isSameDate(date, now);
}

export function isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return isSameDate(date, yesterday);
}

export function toMilliseconds({days, hours, minutes, seconds}: {days?: number; hours?: number; minutes?: number; seconds?: number}) {
    const totalSeconds = toSeconds({days, hours, minutes, seconds});
    return totalSeconds * 1000;
}

export function toSeconds({days, hours, minutes, seconds}: {days?: number; hours?: number; minutes?: number; seconds?: number}) {
    const totalHours = ((days || 0) * 24) + (hours || 0);
    const totalMinutes = (totalHours * 60) + (minutes || 0);
    const totalSeconds = (totalMinutes * 60) + (seconds || 0);
    return totalSeconds;
}

export function getReadableTimestamp(timestamp: number, timeZone: string, isMilitaryTime: boolean, currentUserLocale: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        // Guard: callers (e.g. scheduled-message "Send on …" label) may pass an undefined/NaN
        // timestamp during reschedule transitions. Returning '' avoids rendering the literal
        // string "Invalid Date" in the UI (surfaced as MM-T5720 on the Drafts > Scheduled tab).
        return '';
    }
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: !isMilitaryTime,
        timeZone: timeZone as string,
        ...(isCurrentYear ? {} : {year: 'numeric'}),
    };

    return date.toLocaleString(currentUserLocale, options);
}

export function formatTime(seconds: number, textTime: boolean = false, intl?: IntlShape) {
    const h = Math.max(Math.floor(seconds / 3600), 0);
    const m = Math.max(Math.floor((seconds % 3600) / 60), 0);
    const s = Math.max(Math.floor(seconds % 60), 0);

    if (textTime && intl) {
        const parts: string[] = [];
        if (h > 0) {
            parts.push(intl.formatMessage({id: 'mobile.format_time.text_time.hours_component', defaultMessage: '{hours}h'}, {hours: h}));
        }
        if (m > 0) {
            parts.push(intl.formatMessage({id: 'mobile.format_time.text_time.minutes_component', defaultMessage: '{minutes}m'}, {minutes: m}));
        }
        if (s > 0) {
            parts.push(intl.formatMessage({id: 'mobile.format_time.text_time.seconds_component', defaultMessage: '{seconds}s'}, {seconds: s}));
        }
        return parts.length > 0 ? parts.join(' ') : intl.formatMessage({id: 'mobile.format_time.text_time.seconds_component', defaultMessage: '{seconds}s'}, {seconds: 0});
    }

    const hh = h > 0 ? `${h}:` : '';
    const mm = h > 0 ? `${m.toString().padStart(2, '0')}` : `${m}`;
    const ss = s.toString().padStart(2, '0');

    return `${hh}${mm}:${ss}`;
}
