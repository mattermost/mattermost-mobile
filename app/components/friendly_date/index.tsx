// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import React from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle} from 'react-native';

import {DateTime} from '@constants';

const {SECONDS} = DateTime;

type Props = {
    style?: StyleProp<TextStyle>;
    value: number;
};

function FriendlyDate({style, value}: Props) {
    const intl = useIntl();
    const formattedTime = getFriendlyDate(intl, value);
    return (
        <Text style={style}>{formattedTime}</Text>
    );
}

function getDiff(inputDate: number, unit: moment.unitOfTime.Diff) {
    const input = new Date(inputDate);
    const today = new Date();

    const momentA = moment.utc(input.getTime());
    const momentB = moment.utc(today.getTime());

    const diff = momentA.startOf(unit).diff(momentB.startOf(unit), unit);

    return diff;
}

export function getFriendlyDate(intl: IntlShape, inputDate: number): string {
    const today = new Date();
    const date = new Date(inputDate);
    const difference = (date.getTime() - today.getTime()) / 1000;
    const absoluteDifference = Math.abs(difference);
    const sign = Math.sign(difference);

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
    if (absoluteDifference < SECONDS.MINUTE) {
        return intl.formatMessage({
            id: 'friendly_date.now',
            defaultMessage: 'Now',
        });
    }

    // Message: Minutes
    if (absoluteDifference < SECONDS.HOUR) {
        return intl.formatRelativeTime(getDiff(inputDate, 'minute'), 'minute', {numeric: 'auto', style: 'short'});
    }

    // Message: Hours
    if (absoluteDifference < SECONDS.DAY) {
        return intl.formatRelativeTime(getDiff(inputDate, 'hour'), 'hour', {numeric: 'auto'});
    }

    // Message: Days
    if (absoluteDifference < SECONDS.DAYS_31) {
        const passedDate = sign === 1 ? today.getDate() <= date.getDate() : today.getDate() >= date.getDate();
        const completedAMonth = today.getMonth() !== date.getMonth() && passedDate;
        if (!completedAMonth) {
            return intl.formatRelativeTime(getDiff(inputDate, 'day'), 'day', {numeric: 'auto'});
        }
    }

    // Message: Months
    if (absoluteDifference < SECONDS.DAYS_366) {
        return intl.formatRelativeTime(getDiff(inputDate, 'month'), 'month', {numeric: 'auto'});
    }

    // Message: Years
    return intl.formatRelativeTime(getDiff(inputDate, 'year'), 'year', {numeric: 'auto'});
}

export default FriendlyDate;
