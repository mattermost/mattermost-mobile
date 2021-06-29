// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {Text, TextProps} from 'react-native';

import type {UserTimezone} from '@mm-redux/types/users';

type FormattedDateProps = TextProps & {
    format: string;
    timezone?: string | UserTimezone | null;
    value: number | string | Date;
}

const FormattedDate = ({format, timezone, value, ...props}: FormattedDateProps) => {
    let formattedDate = moment(value).format(format);
    if (timezone) {
        let zone = timezone as string;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        }
        formattedDate = moment.tz(value, zone).format(format);
    }

    return <Text {...props}>{formattedDate}</Text>;
};

FormattedDate.defaultProps = {
    format: 'ddd, MMM DD, YYYY',
};

export default FormattedDate;
