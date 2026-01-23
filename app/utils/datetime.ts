// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

export function formatTime(seconds: number, textTime: boolean = false) {
    const h = Math.max(Math.floor(seconds / 3600), 0);
    const m = Math.max(Math.floor((seconds % 3600) / 60), 0);
    const s = Math.max(Math.floor(seconds % 60), 0);

    if (textTime) {
        const parts: string[] = [];
        if (h > 0) {
            parts.push(`${h}h`);
        }
        if (m > 0) {
            parts.push(`${m}m`);
        }
        if (s > 0) {
            parts.push(`${s}s`);
        }
        return parts.length > 0 ? parts.join(' ') : '0s';
    }

    const hh = h > 0 ? `${h}:` : '';
    const mm = h > 0 ? `${m.toString().padStart(2, '0')}` : `${m}`;
    const ss = s.toString().padStart(2, '0');

    return `${hh}${mm}:${ss}`;
}
