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
import {Text, TextStyle} from 'react-native';
import FormattedText from '@components/formatted_text';
import {Theme} from '@mm-redux/types/preferences';
import {makeStyleSheetFromTheme} from '@utils/theme';
type Props = {
    timezone?: string;
    theme: Theme;
    time: Date;
    styleProp?: TextStyle;
}

const CustomStatusExpiry = (props: Props) => {
    const {timezone, time, theme, styleProp} = props;
    const styles = createStyleSheet(theme);
    const militaryTime = useSelector((state: GlobalState) => getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time'));
    const currentMomentTime = timezone ? getCurrentDateAndTimeForTimezone(timezone) : moment();

    const expiryMomentTime = timezone ? moment(time).tz(timezone) : moment(time);

    let currentMomentTimeClone = currentMomentTime.clone();
    const plusSixDaysDayEndTime = currentMomentTimeClone.add(6, 'days').endOf('day');
    currentMomentTimeClone = currentMomentTime.clone();
    const tomorrowDayEndTime = currentMomentTimeClone.add(1, 'day').endOf('day');
    currentMomentTimeClone = currentMomentTime.clone();
    const todayEndTime = currentMomentTimeClone.endOf('day');

    let useTime = true;
    let useDay = false;
    let isTomorrow = false;
    let isToday = false;

    if (expiryMomentTime.isSame(todayEndTime)) {
        isToday = true;
    }
    if (expiryMomentTime.isAfter(todayEndTime) && expiryMomentTime.isBefore(tomorrowDayEndTime)) {
        isTomorrow = true;
    }
    if (expiryMomentTime.isSame(todayEndTime) || expiryMomentTime.isAfter(tomorrowDayEndTime)) {
        useTime = false;
    }
    if (expiryMomentTime.isBetween(tomorrowDayEndTime, plusSixDaysDayEndTime)) {
        useDay = true;
    }

    const showDay = !useTime && useDay && (
        <FormattedDate
            format='dddd'
            timezone={timezone}
            value={expiryMomentTime}
            style={styleProp || styles.text}
        />
    );

    const showDate = !(isToday || useTime || useDay) && (
        <FormattedDate
            format='MMM DD, YYYY'
            timezone={timezone}
            value={expiryMomentTime}
            style={styleProp || styles.text}
        />
    );

    const showTime = useTime && (
        <FormattedTime
            hour12={!militaryTime}
            timezone={timezone}
            value={expiryMomentTime}
            style={styleProp || styles.text}
        />
    );

    const showTomorrow = isTomorrow && (
        <FormattedText
            id='custom_status.expiry_time.tomorrow'
            defaultMessage='Tomorrow'
            style={styleProp || styles.text}
        />
    );

    const showToday = isToday && (
        <FormattedText
            id='custom_status.expiry_time.today'
            defaultMessage='Today'
            style={styleProp || styles.text}
        />
    );

    return (
        <>
            <Text style={styleProp || styles.text}>{' ('}</Text>
            <FormattedText
                id='custom_status.until'
                defaultMessage='Until'
                style={styleProp || styles.text}
            />
            <Text style={styleProp || styles.text}>{' '}</Text>
            {showToday}
            {showTomorrow}
            {isToday || isTomorrow ? <Text>{' '}</Text> : null}
            {showTime}
            {showDay}
            {showDate}
            <Text style={styleProp || styles.text}>{') '}</Text>
        </>
    );
};

export default CustomStatusExpiry;

const createStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        labelContainer: {
            alignItems: 'center',
            flexDirection: 'row',
        },
        text: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});
