// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import moment from 'moment-timezone';

import FormattedDate from '@components/formatted_date';
import FormattedTime from '@components/formatted_time';
import {getCurrentMomentForTimezone} from '@utils/timezone';
import {GlobalState} from '@mm-redux/types/store';
import {getBool} from '@mm-redux/selectors/entities/preferences';
import Preferences from '@mm-redux/constants/preferences';
import {useSelector} from 'react-redux';
import {Text, TextStyle} from 'react-native';
import FormattedText from '@components/formatted_text';
import {Theme} from '@mm-redux/types/preferences';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getCurrentUserTimezone} from '@mm-redux/selectors/entities/timezone';
type Props = {
    theme: Theme;
    time: Date;
    styleProp?: TextStyle;
    testID?: string;
    showPrefix?: boolean;
    withinBrackets?: boolean;
}

const CustomStatusExpiry = (props: Props) => {
    const {time, theme, styleProp, showPrefix, withinBrackets} = props;
    const timezone = useSelector(getCurrentUserTimezone);
    const styles = createStyleSheet(theme);
    const militaryTime = useSelector((state: GlobalState) => getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time'));
    const currentMomentTime = getCurrentMomentForTimezone(timezone);

    const expiryMomentTime = timezone ? moment(time).tz(timezone) : moment(time);

    const plusSixDaysEndTime = currentMomentTime.clone().add(6, 'days').endOf('day');
    const tomorrowEndTime = currentMomentTime.clone().add(1, 'day').endOf('day');
    const todayEndTime = currentMomentTime.clone().endOf('day');

    let useTime = true;
    let useDay = false;
    let isTomorrow = false;
    let isToday = false;
    let useDate = false;
    let format = '';

    if (expiryMomentTime.isSame(todayEndTime)) {
        isToday = true;
    }
    if (expiryMomentTime.isAfter(todayEndTime) && expiryMomentTime.isSameOrBefore(tomorrowEndTime)) {
        isTomorrow = true;
    }
    if (expiryMomentTime.isSame(todayEndTime) || expiryMomentTime.isAfter(tomorrowEndTime)) {
        useTime = false;
    }
    if (expiryMomentTime.isBetween(tomorrowEndTime, plusSixDaysEndTime)) {
        useDay = true;
    }

    const isCurrentYear = currentMomentTime.get('y') === expiryMomentTime.get('y');

    useDate = !(isToday || useTime || useDay || !isCurrentYear);

    if (useDay) {
        format = 'dddd';
    } else if (useDate) {
        format = 'MMM DD';
    } else if (!isCurrentYear) {
        format = 'MMM DD, YYYY';
    }

    const showDayorDate = (useDay || useDate || !isCurrentYear) ? (
        <FormattedDate
            format={format}
            timezone={timezone}
            value={expiryMomentTime}
        />
    ) : null;

    const showTime = useTime ? (
        <FormattedTime
            hour12={!militaryTime}
            timezone={timezone}
            value={expiryMomentTime}
        />
    ) : null;

    const showTomorrow = isTomorrow ? (
        <Text>
            <FormattedText
                id='custom_status.expiry_time.tomorrow'
                defaultMessage='Tomorrow'
            />{' at '}
        </Text>
    ) : null;

    const showToday = isToday ? (
        <FormattedText
            id='custom_status.expiry_time.today'
            defaultMessage='Today'
        />
    ) : null;

    const prefix = showPrefix ? (
        <Text>
            <FormattedText
                id='custom_status.expiry.until'
                defaultMessage='Until'
            />{' '}
        </Text>
    ) : null;

    return (
        <Text
            testID={props.testID}
            style={styleProp || styles.text}
        >
            {withinBrackets ? '(' : null}
            {prefix}
            {showToday}
            {showTomorrow}
            {showTime}
            {showDayorDate}
            {withinBrackets ? ')' : null}
        </Text>
    );
};

export default CustomStatusExpiry;

const createStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});
