// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useEffect, useState} from 'react';
import {Text, type TextProps} from 'react-native';

import {toMilliseconds} from '@utils/datetime';

type FormattedRelativeTimeProps = TextProps & {
    timezone?: UserTimezone | string;
    value: number | string | Date;
    updateIntervalInSeconds?: number;
}

const FormattedRelativeTime = ({timezone, value, updateIntervalInSeconds, ...props}: FormattedRelativeTimeProps) => {
    const getFormattedRelativeTime = () => {
        let zone = timezone;
        if (typeof timezone === 'object') {
            zone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
        }

        return timezone ? moment.tz(value, zone as string).fromNow() : moment(value).fromNow();
    };

    const [formattedTime, setFormattedTime] = useState(getFormattedRelativeTime);
    useEffect(() => {
        if (updateIntervalInSeconds) {
            const interval = setInterval(
                () => setFormattedTime(getFormattedRelativeTime()),
                toMilliseconds({seconds: updateIntervalInSeconds}),
            );
            return function cleanup() {
                return clearInterval(interval);
            };
        }
        return function cleanup() {
            return null;
        };
    }, [updateIntervalInSeconds]);

    return (
        <Text {...props}>
            {formattedTime}
        </Text>
    );
};

export default FormattedRelativeTime;
