// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeZone} from 'react-native-localize';

import {logDebug} from '@utils/log';

/** Returns the raw IANA timezone string reported by the device OS. */
export function getDeviceTimezone() {
    return getTimeZone();
}

let lastDeviceTimezone: string | undefined;
let lastSupportedTimezone: string | undefined;

/**
 * The device timezone, but only when Intl can actually format with it.
 *
 * Callers pass this to Intl.DateTimeFormat instead of leaving `timeZone` undefined:
 * Hermes does not resolve an absent/undefined `timeZone` to the device zone, it formats
 * in UTC, which renders the previous day for any local-midnight value on a device at a
 * positive UTC offset. Returns undefined when the platform reports a zone Intl rejects,
 * so callers keep their previous behaviour rather than throwing on every render.
 */
export function getSupportedDeviceTimezone(): string | undefined {
    try {
        const deviceTimezone = getTimeZone();

        if (deviceTimezone !== lastDeviceTimezone) {
            lastDeviceTimezone = deviceTimezone;
            try {
                // Throws a RangeError for a zone Intl cannot use; the resolved value is the
                // canonical name for the one the platform reported.
                lastSupportedTimezone = new Intl.DateTimeFormat('en', {timeZone: deviceTimezone}).resolvedOptions().timeZone;
            } catch {
                logDebug('getSupportedDeviceTimezone: Intl rejected device timezone, falling back to undefined', deviceTimezone);
                lastSupportedTimezone = undefined;
            }
        }
    } catch {
        // getTimeZone() native call failed — return whatever was last cached (or undefined).
    }

    return lastSupportedTimezone;
}
