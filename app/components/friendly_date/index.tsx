// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle} from 'react-native';

import {DateTime} from '@constants';
import {isYesterday} from '@utils/datetime';

const {SECONDS} = DateTime;

type Props = {
    style?: StyleProp<TextStyle>;
    sourceDate?: number | Date;
    value: number | Date;
};

function FriendlyDate({style, sourceDate, value}: Props) {
    const intl = useIntl();
    const formattedTime = getFriendlyDate(intl, value, sourceDate);
    return (
        <Text style={style}>{formattedTime}</Text>
    );
}

export function getFriendlyDate(intl: IntlShape, inputDate: number | Date, sourceDate?: number | Date): string {
    const today = sourceDate ? new Date(sourceDate) : new Date();
    const date = new Date(inputDate);
    const difference = (today.getTime() - date.getTime()) / 1000;
    if (difference < 0) {
        return getFriendlyDateAfter(intl, -difference, date, today);
    }

    return getFriendlyDateBefore(intl, difference, date, today);
}

function getFriendlyDateAfter(intl: IntlShape, difference: number, date: Date, today: Date): string {
    // Message: Now
    if (difference < SECONDS.MINUTE) {
        return intl.formatMessage({
            id: 'friendly_date.now',
            defaultMessage: 'Now',
        });
    }

    // Message: Minutes
    if (difference < SECONDS.HOUR) {
        const minutes = Math.floor(Math.round((10 * difference) / SECONDS.MINUTE) / 10);
        return intl.formatMessage({
            id: 'friendly_date.mins',
            defaultMessage: 'in {count} {count, plural, one {min} other {mins}}',
        }, {
            count: minutes,
        });
    }

    // Message: Hours
    if (difference < SECONDS.DAY) {
        const hours = Math.floor(Math.round((10 * difference) / SECONDS.HOUR) / 10);
        return intl.formatMessage({
            id: 'friendly_date.hours',
            defaultMessage: 'in {count} {count, plural, one {hour} other {hours}}',
        }, {
            count: hours,
        });
    }

    // Message: Days
    if (difference < SECONDS.DAYS_31) {
        if (today.getDate() + 1 === date.getDate() && today.getMonth() === date.getMonth()) {
            return intl.formatMessage({
                id: 'friendly_date.tomorrow',
                defaultMessage: 'Tomorrow',
            });
        }
        const completedAMonth = today.getMonth() !== date.getMonth() && today.getDate() <= date.getDate();
        if (!completedAMonth) {
            const days = Math.floor(Math.round((10 * difference) / SECONDS.DAY) / 10) || 1;
            return intl.formatMessage({
                id: 'friendly_date.days',
                defaultMessage: 'in {count} {count, plural, one {day} other {days}}',
            }, {
                count: days,
            });
        }
    }

    // Message: Months
    if (difference < SECONDS.DAYS_366) {
        const months = Math.floor(Math.round((10 * difference) / SECONDS.DAYS_30) / 10) || 1;
        return intl.formatMessage({
            id: 'friendly_date.months',
            defaultMessage: 'in {count} {count, plural, one {month} other {months}}',
        }, {
            count: months,
        });
    }

    // Message: Years
    const years = Math.floor(Math.round((10 * difference) / SECONDS.DAYS_365) / 10) || 1;
    return intl.formatMessage({
        id: 'friendly_date.years',
        defaultMessage: 'in {count} {count, plural, one {year} other {years}}',
    }, {
        count: years,
    });
}

function getFriendlyDateBefore(intl: IntlShape, difference: number, date: Date, today: Date): string {
    // Message: Now
    if (difference < SECONDS.MINUTE) {
        return intl.formatMessage({
            id: 'friendly_date.now',
            defaultMessage: 'Now',
        });
    }

    // Message: Minutes Ago
    if (difference < SECONDS.HOUR) {
        const minutes = Math.floor(Math.round((10 * difference) / SECONDS.MINUTE) / 10);
        return intl.formatMessage({
            id: 'friendly_date.minsAgo',
            defaultMessage: '{count} {count, plural, one {min} other {mins}} ago',
        }, {
            count: minutes,
        });
    }

    // Message: Hours Ago
    if (difference < SECONDS.DAY) {
        const hours = Math.floor(Math.round((10 * difference) / SECONDS.HOUR) / 10);
        return intl.formatMessage({
            id: 'friendly_date.hoursAgo',
            defaultMessage: '{count} {count, plural, one {hour} other {hours}} ago',
        }, {
            count: hours,
        });
    }

    // Message: Days Ago
    if (difference < SECONDS.DAYS_31) {
        if (isYesterday(date)) {
            return intl.formatMessage({
                id: 'friendly_date.yesterday',
                defaultMessage: 'Yesterday',
            });
        }
        const completedAMonth = today.getMonth() !== date.getMonth() && today.getDate() >= date.getDate();
        if (!completedAMonth) {
            const days = Math.floor(Math.round((10 * difference) / SECONDS.DAY) / 10) || 1;
            return intl.formatMessage({
                id: 'friendly_date.daysAgo',
                defaultMessage: '{count} {count, plural, one {day} other {days}} ago',
            }, {
                count: days,
            });
        }
    }

    // Message: Months Ago
    if (difference < SECONDS.DAYS_366) {
        const completedAnYear = today.getFullYear() !== date.getFullYear() &&
            today.getMonth() >= date.getMonth() &&
            today.getDate() >= date.getDate();
        if (!completedAnYear) {
            const months = Math.floor(Math.round((10 * difference) / SECONDS.DAYS_30) / 10) || 1;
            return intl.formatMessage({
                id: 'friendly_date.monthsAgo',
                defaultMessage: '{count} {count, plural, one {month} other {months}} ago',
            }, {
                count: months,
            });
        }
    }

    // Message: Years Ago
    const years = Math.floor(Math.round((10 * difference) / SECONDS.DAYS_365) / 10) || 1;
    return intl.formatMessage({
        id: 'friendly_date.yearsAgo',
        defaultMessage: '{count} {count, plural, one {year} other {years}} ago',
    }, {
        count: years,
    });
}

export default FriendlyDate;
