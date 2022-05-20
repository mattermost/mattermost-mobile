// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {Text, TextProps} from 'react-native';

type FormattedDateProps = TextProps & {
    format?: string;
    timezone?: string | UserTimezone | null;
    value: number | string | Date;
}

const FormattedDate = ({format = 'MMM DD, YYYY', timezone, value, ...props}: FormattedDateProps) => {
    let formattedDate = moment(value).format(format);
    if (timezone) {
        let zone: string;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        } else {
            zone = timezone;
        }
        formattedDate = moment.tz(value, zone).format(format);
    }

    return <Text {...props}>{formattedDate}</Text>;
};

export default FormattedDate;
