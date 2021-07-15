// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, ViewStyle} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import {isYesterday} from '@utils/datetime';

type Props = {
    intl: typeof intlShape;
    style?: StyleProp<ViewStyle>;
    sourceDate?: number | Date;
    value: number | Date;
};

function FriendlyDate({intl, style, sourceDate, value}: Props) {
    const formattedTime = getFriendlyDate(intl, value, sourceDate);
    return (
        <Text style={style}>{formattedTime}</Text>
    );
}

export function getFriendlyDate(intl: typeof intlShape, inputDate: number | Date, sourceDate?: number | Date): string {
    const today = sourceDate ? new Date(sourceDate) : new Date();
    const date = new Date(inputDate);
    const difference = (today.getTime() - date.getTime()) / 1000;

    // Message: Now
    if (difference < 60) {
        return intl.formatMessage({
            id: 'friendly_date.now',
            defaultMessage: 'Now',
        });
    }

    // Message: Minutes Ago
    if (difference < 3600) { // 1 hour = 60 seconds * 60
        const minutes = Math.floor(difference / 60);
        return intl.formatMessage({
            id: 'friendly_date.minsAgo',
            defaultMessage: '{count} {count, plural, one {min} other {mins}} ago',
        }, {
            count: minutes,
        });
    }

    // Message: Hours Ago
    if (difference < 86400) {
        const hours = Math.floor(difference / 3600);
        return intl.formatMessage({
            id: 'friendly_date.hoursAgo',
            defaultMessage: '{count} {count, plural, one {hour} other {hours}} ago',
        }, {
            count: hours,
        });
    }

    // Message: Days Ago
    if (difference < 2678400) { // 31 days = 86400 seconds * 31 days (max value)
        if (isYesterday(date)) {
            return intl.formatMessage({
                id: 'friendly_date.yesterday',
                defaultMessage: 'Yesterday',
            });
        }
        const completedAMonth = today.getMonth() !== date.getMonth() && today.getDate() >= date.getDate();
        if (!completedAMonth) {
            const days = Math.floor(difference / 86400) || 1;
            return intl.formatMessage({
                id: 'friendly_date.daysAgo',
                defaultMessage: '{count} {count, plural, one {day} other {days}} ago',
            }, {
                count: days,
            });
        }
    }

    // Message: Months Ago
    if (difference < 31622400) { // 366 days * 86400 seconds
        const completedAnYear = today.getFullYear() !== date.getFullYear() &&
            today.getMonth() >= date.getMonth() &&
            today.getDate() >= date.getDate();
        if (!completedAnYear) {
            const months = Math.floor(difference / 2592000) || 1; // 30 days per month * 86400 seconds
            return intl.formatMessage({
                id: 'friendly_date.monthsAgo',
                defaultMessage: '{count} {count, plural, one {month} other {months}} ago',
            }, {
                count: months,
            });
        }
    }

    // Message: Years Ago
    const years = Math.floor(difference / 31536000) || 1; // 365 days * 86400 seconds
    return intl.formatMessage({
        id: 'friendly_date.yearsAgo',
        defaultMessage: '{count} {count, plural, one {year} other {years}} ago',
    }, {
        count: years,
    });
}

export default injectIntl(FriendlyDate);
