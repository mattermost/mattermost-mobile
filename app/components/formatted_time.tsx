// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {Text, TextProps} from 'react-native';

import type {UserTimezone} from '@mm-redux/types/users';

type FormattedTimeProps = TextProps & {
    isMilitaryTime: boolean;
    timezone: UserTimezone | string;
    value: number | string | Date;
}

const FormattedTime = ({isMilitaryTime, timezone, value, ...props}: FormattedTimeProps) => {
    const getFormattedTime = () => {
        let format = 'H:mm';
        if (!isMilitaryTime) {
            const localeFormat = moment.localeData().longDateFormat('LT');
            format = localeFormat?.includes('A') ? localeFormat : 'h:mm A';
        }

        let zone = timezone as string;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        }

        return timezone ? moment.tz(value, zone).format(format) : moment(value).format(format);
    };

    const formattedTime = getFormattedTime();

    return (
        <Text {...props}>
            {formattedTime}
        </Text>
    );
};

export default FormattedTime;
