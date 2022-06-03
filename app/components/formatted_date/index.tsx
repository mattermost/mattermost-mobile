// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TextProps} from 'react-native';

import formatDate from '@utils/intl';

type FormattedDateProps = TextProps & {
    format?: string;
    timezone?: string | UserTimezone | null;
    value: number | string | Date;
}

const FormattedDate = ({format = 'MMM DD, YYYY', timezone, value, ...props}: FormattedDateProps) => {
    const {locale} = useIntl();
    const formattedDate = formatDate(value, format, locale, timezone);

    return <Text {...props}>{formattedDate}</Text>;
};

export default FormattedDate;
