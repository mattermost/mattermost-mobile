// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DateTimePicker, {type DateTimePickerEvent} from '@react-native-community/datetimepicker';
import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Button, Platform, TextInput} from 'react-native';

import FormattedText from '@components/formatted_text';
import {parseDateInTimezone} from '@utils/date_utils';
import {parseTimeString, toValidMinuteInterval} from '@utils/datetime';
import {getCurrentMomentForTimezone, getRoundedTime} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    timezone: string;
    isMilitaryTime: boolean;
    theme: Theme;
    handleChange: (currentDate: Moment) => void;
    showInitially?: AndroidMode;
    initialDate?: Moment;
    minuteInterval?: number; // Default: 60 (matching webapp). iOS clamps to: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30
    dateOnly?: boolean;
    testID?: string;
    allowPastDates?: boolean;
    minDate?: string;
    maxDate?: string;
    allowManualTimeEntry?: boolean;
}

type AndroidMode = 'date' | 'time';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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
    manualTimeInput: {
        borderWidth: 1,
        borderColor: theme.centerChannelColor,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 15,
        marginBottom: 10,
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
    manualTimeHint: {
        color: theme.centerChannelColor,
        opacity: 0.64,
        marginHorizontal: 15,
        marginBottom: 8,
        ...typography('Body', 75, 'Regular'),
    },
}));

const DateTimeSelector = ({
    timezone,
    handleChange,
    isMilitaryTime,
    theme,
    showInitially,
    initialDate,
    dateOnly = false,
    testID,
    minuteInterval = 60,
    allowPastDates = false,
    minDate,
    maxDate,
    allowManualTimeEntry = false,
}: Props) => {
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    // Use the effective interval (after iOS clamping) for rounding so that
    // minDate and defaultDate align with what the picker actually displays.
    const effectiveInterval = toValidMinuteInterval(minuteInterval);

    // Calculate minimum date based on allowPastDates and explicit minDate.
    // Memoized because it is parsed from props and passed to DateTimePicker as a prop.
    // Use parseDateInTimezone to respect the picker's timezone for date-only strings.
    const calculatedMinDate = useMemo<Moment | undefined>(() => {
        if (minDate) {
            return parseDateInTimezone(minDate, timezone) || undefined;
        }
        if (!allowPastDates) {
            return getRoundedTime(getCurrentMomentForTimezone(timezone), effectiveInterval);
        }
        return undefined;
    }, [minDate, allowPastDates, timezone, effectiveInterval]);

    const calculatedMaxDate = useMemo<Moment | undefined>(
        () => (maxDate ? (parseDateInTimezone(maxDate, timezone) || undefined) : undefined),
        [maxDate, timezone],
    );

    // Lazy initializer: the default is only needed on mount, so it should not be
    // recomputed on every render. Use initialDate if provided and valid, otherwise
    // use the rounded current time.
    const [date, setDate] = useState<Moment>(() => {
        if (initialDate?.isValid()) {
            return initialDate;
        }
        const currentTime = getCurrentMomentForTimezone(timezone);
        if (dateOnly) {
            return currentTime.clone().startOf('day');
        }
        return getRoundedTime(currentTime, effectiveInterval);
    });
    const [mode, setMode] = useState<AndroidMode>(showInitially || 'date');
    const [show, setShow] = useState<boolean>(Boolean(showInitially));
    const [manualTimeText, setManualTimeText] = useState<string>('');
    const [useManualEntry, setUseManualEntry] = useState<boolean>(false);

    const onChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
        // On Android, dismiss (back/cancel) fires onChange with type 'dismissed'
        if (event.type === 'dismissed') {
            setShow(false);
            return;
        }

        const currentDate = selectedDate || date;
        setShow(Platform.OS === 'ios');

        const momentDate = moment.tz(currentDate, timezone);
        setDate(momentDate);
        handleChange(momentDate);
    }, [date, timezone, handleChange]);

    const showDatepicker = useCallback(() => {
        if (show && mode === 'date') {
            setShow(false);
        } else {
            setShow(true);
            setMode('date');
        }
    }, [show, mode]);

    const showTimepicker = useCallback(() => {
        if (allowManualTimeEntry) {
            const entering = !useManualEntry;
            setUseManualEntry(entering);
            setShow(false);
            if (entering) {
                // Sync text to current date so the field isn't stale
                setManualTimeText(date.format(isMilitaryTime ? 'HH:mm' : 'h:mm A'));
            }
        } else if (show && mode === 'time') {
            setShow(false);
        } else {
            setShow(true);
            setMode('time');
        }
    }, [allowManualTimeEntry, useManualEntry, date, isMilitaryTime, show, mode]);

    const handleManualTimeSubmit = useCallback(() => {
        const parsed = parseTimeString(manualTimeText);
        if (parsed) {
            const newDate = date.clone().hour(parsed.hours).minute(parsed.minutes).second(0);
            setDate(newDate);
            handleChange(newDate);
        } else if (manualTimeText.trim()) {
            // Invalid input — reset to current date value
            setManualTimeText(date.format(isMilitaryTime ? 'HH:mm' : 'h:mm A'));
        }
    }, [manualTimeText, date, handleChange, isMilitaryTime]);

    const timeHint = isMilitaryTime ? '14:30' : '2:30 PM';

    return (
        <View
            style={styles.container}
            testID={testID || 'custom_date_time_picker'}
        >
            <View style={styles.buttonContainer}>
                <Button
                    testID={testID ? `${testID}.select.button` : 'custom_status_clear_after.menu_item.date_and_time.button.date'}
                    onPress={showDatepicker}
                    title={intl.formatMessage({id: 'date_time_selector.select_date', defaultMessage: 'Select Date'})}
                    color={theme.buttonBg}
                />
                {!dateOnly && (
                    <Button
                        testID={testID ? `${testID}.time.button` : 'custom_status_clear_after.menu_item.date_and_time.button.time'}
                        onPress={showTimepicker}
                        title={intl.formatMessage({id: 'date_time_selector.select_time', defaultMessage: 'Select Time'})}
                        color={theme.buttonBg}
                    />
                )}
            </View>
            {!dateOnly && allowManualTimeEntry && useManualEntry && (
                <View>
                    <TextInput
                        testID={testID ? `${testID}.manual_time.input` : 'custom_date_time_picker.manual_time.input'}
                        style={styles.manualTimeInput}
                        value={manualTimeText}
                        onChangeText={setManualTimeText}
                        onSubmitEditing={handleManualTimeSubmit}
                        onBlur={handleManualTimeSubmit}
                        placeholder={timeHint}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        keyboardType='default'
                        returnKeyType='done'
                        autoCapitalize='none'
                    />
                    <FormattedText
                        style={styles.manualTimeHint}
                        id='date_time_selector.manual_time_hint'
                        defaultMessage='Enter time (e.g. {example})'
                        values={{example: timeHint}}
                    />
                </View>
            )}
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
                    minuteInterval={effectiveInterval}
                    timeZoneName={timezone}
                />
            )}
        </View>
    );
};

export default DateTimeSelector;
