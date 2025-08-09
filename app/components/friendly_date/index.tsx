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
