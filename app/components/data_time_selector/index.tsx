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
    minuteInterval?: 5 | 30;
}

type AndroidMode = 'date' | 'time';

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
    minuteInterval = 30,
}: Props) => {
    const styles = getStyleSheet(theme);
    const currentTime = getCurrentMomentForTimezone(timezone);
    const minimumDate = getRoundedTime(currentTime, minuteInterval);

    const defaultDate = initialDate && initialDate.isAfter(minimumDate) ? initialDate : minimumDate;
    const [date, setDate] = useState<Moment>(defaultDate);
    const [mode, setMode] = useState<AndroidMode>(showInitially || 'date');
    const [show, setShow] = useState<boolean>(Boolean(showInitially));

    const onChange = (_: DateTimePickerEvent, selectedDate: Date) => {
        const currentDate = selectedDate || date;
        setShow(Platform.OS === 'ios');
        if (moment(currentDate).isAfter(minimumDate)) {
            setDate(moment(currentDate));
            handleChange(moment(currentDate));
        }
    };

    const showMode = (currentMode: AndroidMode) => {
        setShow(true);
        setMode(currentMode);
    };

    const showDatepicker = () => {
        showMode('date');
        handleChange(moment(date));
    };

    const showTimepicker = () => {
        showMode('time');
        handleChange(moment(date));
    };

    return (
        <View
            style={styles.container}
            testID='custom_date_time_picker'
        >
            <View style={styles.buttonContainer}>
                <Button
                    testID={'custom_status_clear_after.menu_item.date_and_time.button.date'}
                    onPress={showDatepicker}
                    title='Select Date'
                    color={theme.buttonBg}
                />
                <Button
                    testID={'custom_status_clear_after.menu_item.date_and_time.button.time'}
                    onPress={showTimepicker}
                    title='Select Time'
                    color={theme.buttonBg}
                />
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
                    minimumDate={minimumDate.toDate()}
                    minuteInterval={minuteInterval}
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
