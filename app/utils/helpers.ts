// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment-timezone';
import {NativeModules, Platform} from 'react-native';

import {CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES} from '@constants/custom_status';
import {STATUS_BAR_HEIGHT} from '@constants/view';

const {SplitView} = NativeModules;
const {isRunningInSplitView} = SplitView;
const ShareModule: NativeShareExtension|undefined = Platform.select({android: NativeModules.MattermostShare});

// isMinimumServerVersion will return true if currentVersion is equal to higher or than
// the provided minimum version. A non-equal major version will ignore minor and dot
// versions, and a non-equal minor version will ignore dot version.
// currentVersion is a string, e.g '4.6.0'
// minMajorVersion, minMinorVersion, minDotVersion are integers
export const isMinimumServerVersion = (currentVersion = '', minMajorVersion = 0, minMinorVersion = 0, minDotVersion = 0): boolean => {
    if (!currentVersion || typeof currentVersion !== 'string') {
        return false;
    }

    const split = currentVersion.split('.');

    const major = parseInt(split[0], 10);
    const minor = parseInt(split[1] || '0', 10);
    const dot = parseInt(split[2] || '0', 10);

    if (major > minMajorVersion) {
        return true;
    }
    if (major < minMajorVersion) {
        return false;
    }

    // Major version is equal, check minor
    if (minor > minMinorVersion) {
        return true;
    }
    if (minor < minMinorVersion) {
        return false;
    }

    // Minor version is equal, check dot
    if (dot > minDotVersion) {
        return true;
    }
    if (dot < minDotVersion) {
        return false;
    }

    // Dot version is equal
    return true;
};

export function buildQueryString(parameters: Dictionary<any>): string {
    const keys = Object.keys(parameters);
    if (keys.length === 0) {
        return '';
    }

    let query = '?';
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (parameters[key] == null) {
            continue;
        }
        query += key + '=' + encodeURIComponent(parameters[key]);

        if (i < keys.length - 1) {
            query += '&';
        }
    }

    return query;
}

export function isEmail(email: string): boolean {
    // writing a regex to match all valid email addresses is really, really hard. (see http://stackoverflow.com/a/201378)
    // this regex ensures:
    // - at least one character that is not a space, comma, or @ symbol
    // - followed by a single @ symbol
    // - followed by at least one character that is not a space, comma, or @ symbol
    // this prevents <Outlook Style> outlook.style@domain.com addresses and multiple comma-separated addresses from being accepted
    return (/^[^ ,@]+@[^ ,@]+$/).test(email);
}

export function identity<T>(arg: T): T {
    return arg;
}

export function safeParseJSON(rawJson: string | Record<string, unknown> | unknown[]) {
    let data = rawJson;
    try {
        if (typeof rawJson == 'string') {
            data = JSON.parse(rawJson);
        }
    } catch {
        // Do nothing
    }

    return data;
}

export function getCurrentMomentForTimezone(timezone: string | null) {
    return timezone ? moment.tz(timezone) : moment();
}

export function getUtcOffsetForTimeZone(timezone: string) {
    return moment.tz(timezone).utcOffset();
}

export function toTitleCase(str: string) {
    function doTitleCase(txt: string) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
    return str.replace(/\w\S*/g, doTitleCase);
}

export function getRoundedTime(value: Moment) {
    const roundedTo = CUSTOM_STATUS_TIME_PICKER_INTERVALS_IN_MINUTES;
    const start = moment(value);
    const diff = start.minute() % roundedTo;
    if (diff === 0) {
        return value;
    }
    const remainder = roundedTo - diff;
    return start.add(remainder, 'm').seconds(0).milliseconds(0);
}

export function isTablet() {
    const result: SplitViewResult = isRunningInSplitView();
    return result.isTablet && !result.isSplitView;
}

export const pluckUnique = (key: string) => (array: Array<{[key: string]: unknown}>) => Array.from(new Set(array.map((obj) => obj[key])));

export function bottomSheetSnapPoint(itemsCount: number, itemHeight: number, bottomInset: number) {
    const bottom = Platform.select({ios: bottomInset, default: 0}) + STATUS_BAR_HEIGHT;
    return (itemsCount * itemHeight) + bottom;
}

export function hasTrailingSpaces(term: string) {
    return term.length !== term.trimEnd().length;
}

/**
 * isMainActivity returns true if the current activity on Android is the MainActivity otherwise it returns false,
 * on iOS the result is always true
 *
 * @returns boolean
 */
export function isMainActivity() {
    return Platform.select({
        default: true,
        android: ShareModule?.getCurrentActivityName() === 'MainActivity',
    });
}

export function areBothStringArraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) {
        return false;
    }

    if (a.length === 0 && b.length === 0) {
        return false;
    }

    const aSorted = a.sort();
    const bSorted = b.sort();
    const areBothEqual = aSorted.every((value, index) => value === bSorted[index]);

    return areBothEqual;
}
