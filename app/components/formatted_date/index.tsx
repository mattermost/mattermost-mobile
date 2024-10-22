// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, type TextProps} from 'react-native';

export type FormattedDateFormat = Exclude<Intl.DateTimeFormatOptions, 'timeZone'>;

type FormattedDateProps = TextProps & {
    format?: FormattedDateFormat;
    timezone?: string | UserTimezone | null;
    value: number | string | Date;
}

const FormattedDate = ({
    format = {dateStyle: 'medium'},
    timezone,
    value,
    ...props
}: FormattedDateProps) => {
    const {locale} = useIntl();

    let timeZone: string | undefined;
    if (timezone && typeof timezone === 'object') {
        timeZone = timezone.useAutomaticTimezone ? timezone.automaticTimezone : timezone.manualTimezone;
    } else {
        timeZone = timezone ?? undefined;
    }

    const formattedDate = new Intl.DateTimeFormat(locale, {
        ...format,
        timeZone,
    }).format(new Date(value));

    return <Text {...props}>{formattedDate}</Text>;
};

export default FormattedDate;
