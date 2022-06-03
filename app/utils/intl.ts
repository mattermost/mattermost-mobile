// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';

export default function formatDate(value: number | string | Date, format: string, locale: string, timezone?: string | UserTimezone | null) {
    moment.locale(locale);
    if (timezone) {
        let zone: string;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        } else {
            zone = timezone;
        }
        return moment.tz(value, zone).format(format);
    }

    return moment(value).format(format);
}
