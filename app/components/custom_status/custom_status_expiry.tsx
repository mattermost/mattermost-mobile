// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import moment from 'moment-timezone';

import FormattedDate from '@components/formatted_date';
import FormattedTime from '@components/formatted_time';
import {getCurrentDateAndTimeForTimezone} from '@utils/timezone';
import {GlobalState} from '@mm-redux/types/store';
import {getBool} from '@mm-redux/selectors/entities/preferences';
import Preferences from '@mm-redux/constants/preferences';
import {useSelector} from 'react-redux';
import {Text, View} from 'react-native';
import FormattedText from '@components/formatted_text';
import {Theme} from '@mm-redux/types/preferences';
type Props = {
    timezone?: string;
    theme: Theme;
    time: Date;
}

const CustomStatusExpiry = (props: Props) => {
    const {timezone, time} = props;
    const militaryTime = useSelector((state: GlobalState) => getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time'));
    const currentTime = timezone ? getCurrentDateAndTimeForTimezone(timezone) : new Date();
    const currentMomentTime = moment(currentTime);

    const expiryMomentTime = timezone ? moment(time).tz(timezone) : moment(time);

    let useTime = true;
    let useDay = false;
    let isTomorrow = false;
    let isToday = false;
    if (moment(time).isSame(currentMomentTime.endOf('day'))) {
        isToday = true;
    }
    if (moment(time).isAfter(currentMomentTime.endOf('day')) && moment(time).isBefore(currentMomentTime.add(1, 'day').endOf('day'))) {
        isTomorrow = true;
    }
    if (moment(time).isSame(currentMomentTime.endOf('day')) || moment(time).isAfter(currentMomentTime.add(1, 'day').endOf('day'))) {
        useTime = false;
    }
    if (moment(time).isAfter(currentMomentTime.add(1, 'day').endOf('day')) && moment(time).isBefore(currentMomentTime.add(6, 'days'))) {
        useDay = true;
    }

    const showDay = !useTime && useDay && (
        <FormattedDate
            format='dddd'
            timezone={timezone}
            value={time}
        />
    );

    const showDate = !isToday && !useTime && !useDay && (
        <FormattedDate
            format='MMM DD, YYYY'
            timezone={timezone}
            value={expiryMomentTime}
        />
    );

    const showTime = useTime && (
        <FormattedTime
            hour12={!militaryTime}
            timezone={timezone}
            value={expiryMomentTime}
        />
    );

    const showTomorrow = isTomorrow && (
        <FormattedText
            id='custom_status.expiry_time.tomorrow'
            defaultMessage='Tomorrow'
        />
    );

    const showToday = isToday && (
        <FormattedText
            id='custom_status.expiry_time.today'
            defaultMessage='Today'
        />
    );

    return (
        <View
            style={{
                alignItems: 'center',
                flexDirection: 'row',
            }}
        >
            {showToday}
            {showTomorrow}
            {isToday || isTomorrow ? <Text>{' '}</Text> : null}
            {showTime}
            {showDay}
            {showDate}
        </View>
    );
};

export default CustomStatusExpiry;
