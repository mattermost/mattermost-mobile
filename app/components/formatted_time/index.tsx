// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import mtz from 'moment-timezone';
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, type TextProps} from 'react-native';

import {getLocaleFromLanguage} from '@i18n';

type FormattedTimeProps = TextProps & {
    isMilitaryTime: boolean;
    timezone: UserTimezone | string;
    value: number | string | Date;
}

const FormattedTime = ({isMilitaryTime, timezone, value, ...props}: FormattedTimeProps) => {
    const {locale} = useIntl();
    moment.locale(getLocaleFromLanguage(locale).toLowerCase());
    const getFormattedTime = () => {
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
    };

    const formattedTime = getFormattedTime();

    return (
        <Text {...props}>
            {formattedTime}
        </Text>
    );
};

export default FormattedTime;
