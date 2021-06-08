// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {Text, TextStyle} from 'react-native';
import {useSelector} from 'react-redux';

import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Preferences from '@mm-redux/constants/preferences';
import {getBool} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserTimezone} from '@mm-redux/selectors/entities/timezone';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getCurrentMomentForTimezone} from '@utils/timezone';

import {Theme} from '@mm-redux/types/preferences';
import {GlobalState} from '@mm-redux/types/store';

type Props = {
    theme: Theme;
    time: Date;
    textStyles?: TextStyle;
    testID?: string;
    showPrefix?: boolean;
    withinBrackets?: boolean;
}

const CustomStatusExpiry = ({time, theme, textStyles, showPrefix, withinBrackets, testID}: Props) => {
    const timezone = useSelector(getCurrentUserTimezone);
    const styles = createStyleSheet(theme);
    const militaryTime = useSelector((state: GlobalState) => getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time'));
    const currentMomentTime = getCurrentMomentForTimezone(timezone);

    const expiryMomentTime = timezone ? moment(time).tz(timezone) : moment(time);

    const plusSixDaysEndTime = currentMomentTime.clone().add(6, 'days').endOf('day');
    const tomorrowEndTime = currentMomentTime.clone().add(1, 'day').endOf('day');
    const todayEndTime = currentMomentTime.clone().endOf('day');
    const isCurrentYear = currentMomentTime.get('y') === expiryMomentTime.get('y');

    let useTime = true;
    let format = '';
    let renderDayOrDate;

    if (expiryMomentTime.isSame(todayEndTime)) {
        renderDayOrDate = (
            <FormattedText
                id='custom_status.expiry_time.today'
                defaultMessage='Today'
            />
        );
    } else if (expiryMomentTime.isAfter(todayEndTime) && expiryMomentTime.isSameOrBefore(tomorrowEndTime)) {
        renderDayOrDate = (
            <Text>
                <FormattedText
                    id='custom_status.expiry_time.tomorrow'
                    defaultMessage='Tomorrow'
                />
                {' '}
                <FormattedText
                    id='custom_status.expiry.at'
                    defaultMessage='at'
                />
                {' '}
            </Text>
        );
    }

    const useDay = expiryMomentTime.isBetween(tomorrowEndTime, plusSixDaysEndTime);
    const useDate = expiryMomentTime.isAfter(plusSixDaysEndTime) && isCurrentYear;

    if (useDay) {
        format = 'dddd';
    } else if (useDate) {
        format = 'MMM DD';
    } else if (!isCurrentYear) {
        format = 'MMM DD, YYYY';
    }

    if (expiryMomentTime.isAfter(tomorrowEndTime)) {
        renderDayOrDate = (
            <FormattedDate
                format={format}
                timezone={timezone}
                value={expiryMomentTime}
            />
        );
    }

    if (expiryMomentTime.isSame(todayEndTime) || expiryMomentTime.isAfter(tomorrowEndTime)) {
        useTime = false;
    }

    const showTime = useTime ? (
        <FormattedTime
            hour12={!militaryTime}
            timezone={timezone}
            value={expiryMomentTime}
        />
    ) : undefined;

    const prefix = showPrefix ? (
        <Text>
            <FormattedText
                id='custom_status.expiry.until'
                defaultMessage='Until'
            />{' '}
        </Text>
    ) : undefined;

    return (
        <Text
            testID={testID}
            style={{...styles.text, ...textStyles}}
        >
            {withinBrackets && '('}
            {prefix}
            {renderDayOrDate}
            {showTime}
            {withinBrackets && ')'}
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
