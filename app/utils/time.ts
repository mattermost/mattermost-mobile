// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mtz from 'moment-timezone';

export function getFormattedTime(isMilitaryTime: boolean, timezone: UserTimezone | string, value: number | string | Date) {
    let format = 'H:mm';
    if (!isMilitaryTime) {
        const localeFormat = mtz.localeData().longDateFormat('LT');
        format = localeFormat?.includes('A') ? localeFormat : 'h:mm A';
    }

    let zone: string;
    if (typeof timezone === 'object') {
        zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
    } else {
        zone = timezone;
    }

    return timezone ? mtz.tz(value, zone).format(format) : mtz(value).format(format);
}
