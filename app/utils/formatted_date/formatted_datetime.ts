// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import mtz from 'moment-timezone';

import type {FormatDateOptions} from 'react-intl';

export const formattedDateTime_moment = (date = new Date(), locale = 'en-us', format = 'MMM DD, YYYY', timezone?: string | UserTimezone | null): string => {
    moment.locale(locale);
    let formattedDate = mtz(date).format(format);
    if (timezone) {
        let zone: string;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        } else {
            zone = timezone;
        }
        formattedDate = mtz.tz(date, zone).format(format);
    }

    return formattedDate;
};

export const formattedDateTime_intl = (date = new Date(), locale = 'en-us', options?: FormatDateOptions): string => {
    return (new Intl.DateTimeFormat(locale, options)).format(date);
};
