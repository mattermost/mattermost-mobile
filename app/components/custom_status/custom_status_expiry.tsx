// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import moment from 'moment-timezone';
import {Text, TextStyle} from 'react-native';

import {getUserTimezone} from '@actions/local/timezone';
import {Preferences} from '@constants';
import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getCurrentMomentForTimezone} from '@utils/helpers';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser: UserModel;
    showPrefix?: boolean;
    showTimeCompulsory?: boolean;
    showToday?: boolean;
    testID?: string;
    textStyles?: TextStyle;
    theme: Theme;
    time: Date;
    withinBrackets?: boolean;
}

const CustomStatusExpiry = ({currentUser, showPrefix, showTimeCompulsory, showToday, testID = '', textStyles = {}, theme, time, withinBrackets}: Props) => {
    const userTimezone = getUserTimezone(currentUser);
    const timezone = userTimezone.useAutomaticTimezone ? userTimezone.automaticTimezone : userTimezone.manualTimezone;
    const styles = createStyleSheet(theme);
    const militaryTime = Preferences.CATEGORY_DISPLAY_SETTINGS === 'use_military_time';
    const currentMomentTime = getCurrentMomentForTimezone(timezone);

    const expiryMomentTime = timezone ? moment(time).tz(timezone) : moment(time);

    const plusSixDaysEndTime = currentMomentTime.clone().add(6, 'days').endOf('day');
    const tomorrowEndTime = currentMomentTime.clone().add(1, 'day').endOf('day');
    const todayEndTime = currentMomentTime.clone().endOf('day');
    const isCurrentYear = currentMomentTime.get('y') === expiryMomentTime.get('y');

    let dateComponent;
    if ((showToday && expiryMomentTime.isBefore(todayEndTime)) || expiryMomentTime.isSame(todayEndTime)) {
        dateComponent = (
            <FormattedText
                id='custom_status.expiry_time.today'
                defaultMessage='Today'
            />
        );
    } else if (expiryMomentTime.isAfter(todayEndTime) && expiryMomentTime.isSameOrBefore(tomorrowEndTime)) {
        dateComponent = (
            <FormattedText
                id='custom_status.expiry_time.tomorrow'
                defaultMessage='Tomorrow'
            />
        );
    } else if (expiryMomentTime.isAfter(tomorrowEndTime)) {
        let format = 'dddd';
        if (expiryMomentTime.isAfter(plusSixDaysEndTime) && isCurrentYear) {
            format = 'MMM DD';
        } else if (!isCurrentYear) {
            format = 'MMM DD, YYYY';
        }

        dateComponent = (
            <FormattedDate
                format={format}
                timezone={timezone}
                value={expiryMomentTime.toDate()}
            />
        );
    }

    const useTime = showTimeCompulsory || !(expiryMomentTime.isSame(todayEndTime) || expiryMomentTime.isAfter(tomorrowEndTime));

    return (
        <Text
            testID={testID}
            style={[styles.text, textStyles]}
        >
            {withinBrackets && '('}
            {showPrefix && (
                <FormattedText
                    id='custom_status.expiry.until'
                    defaultMessage='Until'
                />
            )}
            {showPrefix && ' '}
            {dateComponent}
            {useTime && dateComponent && (
                <>
                    {' '}
                    <FormattedText
                        id='custom_status.expiry.at'
                        defaultMessage='at'
                    />
                    {' '}
                </>
            )}
            {useTime && (
                <FormattedTime
                    isMilitaryTime={militaryTime}
                    timezone={timezone || ''}
                    value={expiryMomentTime.toDate()}
                />
            )}
            {withinBrackets && ')'}
        </Text>
    );
};

const createStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});

export default CustomStatusExpiry;
