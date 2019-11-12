// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';

import FormattedText from 'app/components/formatted_text';
import FormattedDate from 'app/components/formatted_date';

export default class RecentDate extends React.PureComponent {
    static propTypes = {
        value: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.instanceOf(Date),
        ]).isRequired,
    }

    render() {
        const {value, ...otherProps} = this.props;
        const date = new Date(value);

        if (isToday(date)) {
            return (
                <FormattedText
                    {...otherProps}
                    id='date_separator.today'
                    defaultMessage='Today'
                />
            );
        } else if (isYesterday(date)) {
            return (
                <FormattedText
                    {...otherProps}
                    id='date_separator.yesterday'
                    defaultMessage='Yesterday'
                />
            );
        }

        return (
            <FormattedDate
                {...otherProps}
                value={value}
                weekday='short'
                month='short'
                day='2-digit'
                year='numeric'
            />
        );
    }
}

export function isSameDay(a, b) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function isToday(date) {
    const now = new Date();

    return isSameDay(date, now);
}

export function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return isSameDay(date, yesterday);
}
