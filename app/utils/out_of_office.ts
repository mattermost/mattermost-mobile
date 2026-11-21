// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils/src';
import {DeviceEventEmitter} from 'react-native';

import {safeParseJSON} from '@utils/helpers';
import {logWarning} from '@utils/log';

type NotificationExceptions = {
    enabled: boolean;
    allowCalls: boolean;
    allowMentions: boolean;
};

export type WeeklyOutOfOfficeSettings = NotificationExceptions & {
    schedule: 'weekly';
    quietHoursEnabled: boolean;
    startMinute: number;
    endMinute: number;

    // Device-local weekdays, Sunday = 0 through Saturday = 6.
    daysOff: number[];
};

type DateOutOfOfficeSettings = NotificationExceptions & {
    schedule?: undefined;
    startAt: number;
    endAt: number;
};

export type OutOfOfficeSettings = WeeklyOutOfOfficeSettings | DateOutOfOfficeSettings;

export const OUT_OF_OFFICE_CHANGED = 'outOfOfficeChanged';

function parseSettings(value: unknown): OutOfOfficeSettings {
    const invalid = new Error('Invalid out-of-office settings');
    if (typeof value !== 'object' || !value || Array.isArray(value)) {
        throw invalid;
    }
    const settings = value as Record<string, unknown>;
    if (typeof settings.enabled !== 'boolean' || typeof settings.allowCalls !== 'boolean' || typeof settings.allowMentions !== 'boolean') {
        throw invalid;
    }
    const common = {enabled: settings.enabled, allowCalls: settings.allowCalls, allowMentions: settings.allowMentions};
    if (settings.schedule === 'weekly') {
        if (typeof settings.quietHoursEnabled !== 'boolean' ||
            typeof settings.startMinute !== 'number' || !Number.isInteger(settings.startMinute) || settings.startMinute < 0 || settings.startMinute > 1439 ||
            typeof settings.endMinute !== 'number' || !Number.isInteger(settings.endMinute) || settings.endMinute < 0 || settings.endMinute > 1439 ||
            !Array.isArray(settings.daysOff) || !settings.daysOff.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
            throw invalid;
        }
        return {schedule: 'weekly', enabled: common.enabled, quietHoursEnabled: settings.quietHoursEnabled, startMinute: settings.startMinute, endMinute: settings.endMinute, daysOff: [...new Set<number>(settings.daysOff)], allowCalls: common.allowCalls, allowMentions: common.allowMentions};
    }
    if (settings.schedule !== undefined || typeof settings.startAt !== 'number' || !Number.isFinite(settings.startAt) ||
        typeof settings.endAt !== 'number' || !Number.isFinite(settings.endAt)) {
        throw invalid;
    }
    return {enabled: common.enabled, startAt: settings.startAt, endAt: settings.endAt, allowCalls: common.allowCalls, allowMentions: common.allowMentions};
}

export function isOutOfOfficeActive(settings?: OutOfOfficeSettings, now = Date.now()) {
    if (!settings?.enabled || !Number.isFinite(now)) {
        return false;
    }
    if (settings.schedule === 'weekly') {
        if (settings.quietHoursEnabled && settings.startMinute === settings.endMinute) {
            return false;
        }
        const local = new Date(now);
        if (settings.daysOff.includes(local.getDay())) {
            return true;
        }
        if (!settings.quietHoursEnabled || settings.startMinute === settings.endMinute) {
            return false;
        }
        const minute = (local.getHours() * 60) + local.getMinutes();
        return settings.startMinute < settings.endMinute ?
            minute >= settings.startMinute && minute < settings.endMinute :
            minute >= settings.startMinute || minute < settings.endMinute;
    }
    return Number.isFinite(settings.startAt) && Number.isFinite(settings.endAt) && settings.startAt <= now && now < settings.endAt;
}

// Recheck on local minute boundaries so clock/time-zone changes and repeated DST
// hours are reflected even while an incoming call banner is already mounted.
export function getNextOutOfOfficeCheck(settings?: OutOfOfficeSettings, now = Date.now()): number | undefined {
    if (!settings?.enabled) {
        return undefined;
    }
    if (settings.schedule === 'weekly') {
        return now + (60000 - (now % 60000));
    }
    return [settings.startAt, settings.endAt].find((time) => time > now);
}

export async function getOutOfOfficeSettings(serverUrl: string): Promise<OutOfOfficeSettings | undefined> {
    const stored = await RNUtils.getOutOfOfficeSettings(serverUrl);
    return stored ? parseSettings(safeParseJSON(stored)) : undefined;
}

export async function saveOutOfOfficeSettings(serverUrl: string, settings: OutOfOfficeSettings): Promise<void> {
    const validated = parseSettings(settings);
    if (validated.enabled) {
        if (validated.schedule === 'weekly') {
            if ((validated.quietHoursEnabled && validated.startMinute === validated.endMinute) || (!validated.quietHoursEnabled && !validated.daysOff.length)) {
                throw new Error('Choose different quiet hours or at least one full day off');
            }
        } else if (validated.endAt <= validated.startAt || validated.endAt <= Date.now()) {
            throw new Error('Out-of-office end must follow the start and be in the future');
        }
    }
    await RNUtils.setOutOfOfficeSettings(serverUrl, JSON.stringify(validated));
    DeviceEventEmitter.emit(OUT_OF_OFFICE_CHANGED, serverUrl);
}

export function shouldSuppressOutOfOfficeNotification(settings: OutOfOfficeSettings | undefined, kind: 'message' | 'call', isMention = false, now = Date.now()) {
    if (!isOutOfOfficeActive(settings, now)) {
        return false;
    }
    return kind === 'call' ? !settings?.allowCalls : !(settings?.allowMentions && isMention);
}

export async function suppressNotificationDuringOutOfOffice(serverUrl: string, kind: 'message' | 'call', isMention = false) {
    try {
        return shouldSuppressOutOfOfficeNotification(await getOutOfOfficeSettings(serverUrl), kind, isMention);
    } catch {
        // Preserve normal notification delivery if local storage is unavailable.
        logWarning('suppressNotificationDuringOutOfOffice: unable to read settings');
        return false;
    }
}
