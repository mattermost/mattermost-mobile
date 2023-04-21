// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import mtz from 'moment-timezone';
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, type TextProps} from 'react-native';

import {getLocaleFromLanguage} from '@i18n';

type FormattedDateProps = TextProps & {
    format?: string;
    timezone?: string | UserTimezone | null;
    value: number | string | Date;
}

const FormattedDate = ({format = 'MMM DD, YYYY', timezone, value, ...props}: FormattedDateProps) => {
    const {locale} = useIntl();
    moment.locale(getLocaleFromLanguage(locale).toLowerCase());
    let formattedDate = mtz(value).format(format);
    if (timezone) {
        let zone: string;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        } else {
            zone = timezone;
        }
        formattedDate = mtz.tz(value, zone).format(format);
    }

    return <Text {...props}>{formattedDate}</Text>;
};

export default FormattedDate;
