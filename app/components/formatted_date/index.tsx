// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, type TextProps} from 'react-native';

import {logDebug} from '@utils/log';

export type FormattedDateFormat = Exclude<Intl.DateTimeFormatOptions, 'timeZone'>;

type FormattedDateProps = TextProps & {
    format?: FormattedDateFormat;
    timezone?: string | UserTimezone | null;
    value: number | string | Date;
}

const DEFAULT_FORMAT: FormattedDateFormat = {dateStyle: 'medium'};

const FormattedDate = ({
    format = DEFAULT_FORMAT,
    timezone,
    value,
    ...props
}: FormattedDateProps) => {
    const {locale, formatMessage} = useIntl();

    let timeZone: string | undefined;
    if (timezone && typeof timezone === 'object') {
        timeZone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
    } else {
        timeZone = timezone ?? undefined;
    }

    let formattedDate;
    try {
        formattedDate = new Intl.DateTimeFormat(locale, {
            ...format,
            timeZone,
        }).format(new Date(value));
    } catch (error) {
        logDebug('Failed to format date', {locale, timezone}, error);
    }

    if (!formattedDate) {
        try {
            formattedDate = new Intl.DateTimeFormat(locale, {
                ...format,
            }).format(new Date(value));
        } catch (error) {
            logDebug('Failed to format default date', {locale}, error);
        }
    }

    if (!formattedDate) {
        formattedDate = formatMessage({id: 'date.unknown', defaultMessage: 'Unknown'});
    }

    return <Text {...props}>{formattedDate}</Text>;
};

export default FormattedDate;
