// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import moment, {type Moment} from 'moment-timezone';
import React from 'react';
import {Text, type TextStyle} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import FormattedDate, {type FormattedDateFormat} from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUser} from '@queries/servers/user';
import {getCurrentMomentForTimezone} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {getUserTimezoneProps} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser?: UserModel;
    isMilitaryTime: boolean;
    showPrefix?: boolean;
    showTimeCompulsory?: boolean;
    showToday?: boolean;
    testID?: string;
    textStyles?: TextStyle;
    theme: Theme;
    time: Date | Moment;
    withinBrackets?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});

const DATE_FORMATS = {
    withinWeek: {weekday: 'long'},
    withinYear: {month: 'short', day: 'numeric'},
    afterYear: {dateStyle: 'medium'},
} satisfies Record<string, FormattedDateFormat>;

const CustomStatusExpiry = ({currentUser, isMilitaryTime, showPrefix, showTimeCompulsory, showToday, testID = '', textStyles = {}, theme, time, withinBrackets}: Props) => {
    const userTimezone = getUserTimezoneProps(currentUser);
    const timezone = userTimezone.useAutomaticTimezone ? userTimezone.automaticTimezone : userTimezone.manualTimezone;
    const styles = getStyleSheet(theme);
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
                style={[styles.text, textStyles]}
            />
        );
    } else if (expiryMomentTime.isAfter(todayEndTime) && expiryMomentTime.isSameOrBefore(tomorrowEndTime)) {
        dateComponent = (
            <FormattedText
                id='custom_status.expiry_time.tomorrow'
                defaultMessage='Tomorrow'
                style={[styles.text, textStyles]}
            />
        );
    } else if (expiryMomentTime.isAfter(tomorrowEndTime)) {
        let format: FormattedDateFormat = DATE_FORMATS.withinWeek;
        if (expiryMomentTime.isAfter(plusSixDaysEndTime) && isCurrentYear) {
            format = DATE_FORMATS.withinYear;
        } else if (!isCurrentYear) {
            format = DATE_FORMATS.afterYear;
        }

        dateComponent = (
            <FormattedDate
                format={format}
                timezone={timezone}
                value={expiryMomentTime.toDate()}
                style={[styles.text, textStyles]}
            />
        );
    }

    const useTime = showTimeCompulsory ?? !(expiryMomentTime.isSame(todayEndTime) || expiryMomentTime.isAfter(tomorrowEndTime));

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
                    style={[styles.text, textStyles]}
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
                        style={[styles.text, textStyles]}
                    />
                    {' '}
                </>
            )}
            {useTime && (
                <FormattedTime
                    isMilitaryTime={isMilitaryTime}
                    timezone={timezone || ''}
                    value={expiryMomentTime.toDate()}
                    style={[styles.text, textStyles]}
                />
            )}
            {withinBrackets && ')'}
        </Text>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
    isMilitaryTime: queryDisplayNamePreferences(database).
        observeWithColumns(['value']).pipe(
            switchMap(
                (preferences) => of$(getDisplayNamePreferenceAsBool(preferences, 'use_military_time')),
            ),
        ),
}));

export default withDatabase(enhanced(CustomStatusExpiry));
