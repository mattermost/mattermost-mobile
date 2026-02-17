// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import DateTimePicker, {type DateTimePickerEvent} from '@react-native-community/datetimepicker';
import moment, {type Moment} from 'moment-timezone';
import React, {useState} from 'react';
import {View, Button, Platform} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {getCurrentMomentForTimezone, getRoundedTime} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    timezone: string;
    isMilitaryTime: boolean;
    theme: Theme;
    handleChange: (currentDate: Moment) => void;
    showInitially?: AndroidMode;
    initialDate?: Moment;
    minuteInterval?: number; // iOS supports: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30 (default: 30)
    dateOnly?: boolean;
    testID?: string;
    allowPastDates?: boolean;
    minDate?: string;
    maxDate?: string;
}

type AndroidMode = 'date' | 'time';
type ValidMinuteInterval = 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;

const VALID_INTERVALS = new Set<number>([1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30]);

function toValidMinuteInterval(interval?: number): ValidMinuteInterval {
    if (interval && VALID_INTERVALS.has(interval)) {
        return interval as ValidMinuteInterval;
    }

    // Fallback to 30 for invalid intervals (e.g., webapp's 60-min default)
    // iOS doesn't support 60 - minuteInterval must divide into 60 and be <60
    return 30;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingTop: 10,
            backgroundColor: theme.centerChannelBg,
        },
        buttonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            marginBottom: 10,
        },
    };
});

const DateTimeSelector = ({
    timezone,
    handleChange,
    isMilitaryTime,
    theme,
    showInitially,
    initialDate,
    dateOnly = false,
    testID,
    minuteInterval = 30,
    allowPastDates = false,
    minDate,
    maxDate,
}: Props) => {
    const styles = getStyleSheet(theme);
    const currentTime = getCurrentMomentForTimezone(timezone);

    // Calculate minimum date based on allowPastDates and explicit minDate
    let calculatedMinDate: moment.Moment | undefined;
    if (minDate) {
        calculatedMinDate = moment(minDate);
    } else if (!allowPastDates) {
        calculatedMinDate = getRoundedTime(currentTime, minuteInterval);
    }
    const calculatedMaxDate = maxDate ? moment(maxDate) : undefined;

    // Use initialDate if provided and valid, otherwise use rounded current time
    let defaultDate: moment.Moment;
    if (initialDate?.isValid()) {
        defaultDate = initialDate;
    } else if (dateOnly) {
        // For date-only, start at today at midnight
        defaultDate = currentTime.clone().startOf('day');
    } else {
        // For datetime, start at current time rounded to interval
        defaultDate = getRoundedTime(currentTime, minuteInterval);
    }
    const [date, setDate] = useState<Moment>(defaultDate);
    const [mode, setMode] = useState<AndroidMode>(showInitially || 'date');
    const [show, setShow] = useState<boolean>(Boolean(showInitially));

    const onChange = (_: DateTimePickerEvent, selectedDate: Date) => {
        const currentDate = selectedDate || date;
        setShow(Platform.OS === 'ios');

        // Create moment in the picker's timezone to ensure correct UTC conversion
        const momentDate = moment.tz(currentDate, timezone);
        setDate(momentDate);
        handleChange(momentDate);
    };

    const showMode = (currentMode: AndroidMode) => {
        setShow(true);
        setMode(currentMode);
    };

    const showDatepicker = () => {
        if (show && mode === 'date') {
            // Toggle off if already showing date picker
            setShow(false);
        } else {
            // Show date picker
            showMode('date');
        }

        // Always call handleChange with current date when date picker is accessed
        handleChange(date);
    };

    const showTimepicker = () => {
        if (show && mode === 'time') {
            // Toggle off if already showing time picker
            setShow(false);
        } else {
            // Show time picker
            showMode('time');
        }

        // Always call handleChange with current date when date picker is accessed
        handleChange(date);
    };

    return (
        <View
            style={styles.container}
            testID={testID || 'custom_date_time_picker'}
        >
            <View style={styles.buttonContainer}>
                <Button
                    testID={testID ? `${testID}.select.button` : 'custom_status_clear_after.menu_item.date_and_time.button.date'}
                    onPress={showDatepicker}
                    title='Select Date'
                    color={theme.buttonBg}
                />
                {!dateOnly && (
                    <Button
                        testID={testID ? `${testID}.time.button` : 'custom_status_clear_after.menu_item.date_and_time.button.time'}
                        onPress={showTimepicker}
                        title='Select Time'
                        color={theme.buttonBg}
                    />
                )}
            </View>
            {show && (
                <DateTimePicker
                    testID='custom_status_clear_after.date_time_picker'
                    value={date.toDate()}
                    mode={mode}
                    is24Hour={isMilitaryTime}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChange}
                    textColor={theme.centerChannelColor}
                    minimumDate={calculatedMinDate?.toDate()}
                    maximumDate={calculatedMaxDate?.toDate()}
                    minuteInterval={toValidMinuteInterval(minuteInterval)}
                    timeZoneName={timezone}
                />
            )}
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    isMilitaryTime: queryDisplayNamePreferences(database).
        observeWithColumns(['value']).pipe(
            switchMap(
                (preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.USE_MILITARY_TIME, false)),
            ),
        ),
}));

export default withDatabase(enhanced(DateTimeSelector));
