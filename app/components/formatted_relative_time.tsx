// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useState} from 'react';
import {Text, TextProps} from 'react-native';

import type {UserTimezone} from '@mm-redux/types/users';

type FormattedRelativeTimeProps = TextProps & {
    timezone?: UserTimezone | string;
    value: number | string | Date;
    updateIntervalInSeconds: number;
}

const FormattedRelativeTime = ({timezone, value, ...props}: FormattedRelativeTimeProps) => {
    const getFormattedRelativeTime = () => {
        let zone = timezone;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        }

        return timezone ? moment.tz(value, zone as string).fromNow() : moment(value).fromNow();
    };

    const [formattedTime, setFormattedTime] = useState(getFormattedRelativeTime());
    useEffect(() => {
        const interval = setInterval(() => setFormattedTime(getFormattedRelativeTime()), props.updateIntervalInSeconds * 1000);
        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <Text {...props}>
            {formattedTime}
        </Text>
    );
};

export default FormattedRelativeTime;
