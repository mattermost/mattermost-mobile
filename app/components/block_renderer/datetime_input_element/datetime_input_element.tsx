// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useContext, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import DateTimeSelector from '@components/date_time_selector';
import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Label from '@components/settings/label';
import {DEFAULT_TIME_INTERVAL_MINUTES} from '@constants/apps';
import {getDateValue, isRelativeDate, parseDateInTimezone, resolveRelativeDate} from '@utils/date_utils';
import {getCurrentMomentForTimezone} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {MmBlocksInteractionsDisabledContext} from '../context';
import {MmBlocksFieldError, useMmBlocksForm} from '../form';

import type {ActionHandler} from '../types';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {marginBottom: 24},
    dateDisplay: {marginLeft: 15, marginBottom: 8},
    dateText: {color: theme.linkColor, ...typography('Body', 100, 'Regular')},
    helpText: {color: theme.centerChannelColor, marginLeft: 15, marginTop: 4, opacity: 0.64, ...typography('Body', 75, 'Regular')},
    timezoneIndicator: {flexDirection: 'row', alignItems: 'center', marginLeft: 15, marginBottom: 8, marginTop: -4},
    timezoneText: {color: theme.centerChannelColor, opacity: 0.64, marginLeft: 4, ...typography('Body', 75, 'Regular')},
}));

export type DateTimeInputElementProps = {
    element: MmDateTimeInputBlock;
    onAction: ActionHandler;
    theme: Theme;
    userTimezone: string;
    isMilitaryTime: boolean;
};

function normalizeDateTimeValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

const DateTimeInputElement = ({element, onAction, theme, userTimezone, isMilitaryTime}: DateTimeInputElementProps) => {
    const intl = useIntl();
    const interactionsDisabled = useContext(MmBlocksInteractionsDisabledContext);
    const {values, setValue, setDefaultValue} = useMmBlocksForm();
    const style = getStyleSheet(theme);

    const locationTimezone = element.datetime_config?.location_timezone;
    const displayTimezone = locationTimezone || userTimezone;
    const showTimezoneIndicator = Boolean(locationTimezone);
    const timezoneAbbr = showTimezoneIndicator ? moment.tz(displayTimezone).format('z') : '';

    useEffect(() => {
        if (!element.name) {
            return;
        }
        const raw = element.initial_value ?? '';
        if (!raw) {
            setDefaultValue(element.name, '');
            return;
        }

        // Relative defaults (today, +1d, …) must be stored as ISO so submit validation accepts them.
        if (isRelativeDate(raw)) {
            const resolved = getDateValue(raw, displayTimezone, true);
            setDefaultValue(element.name, resolved ? resolved.toISOString() : raw);
            return;
        }

        setDefaultValue(element.name, raw);
    }, [element.name, element.initial_value, setDefaultValue, displayTimezone]);

    const handleChange = useCallback((picked: Moment) => {
        const next = picked.toISOString();
        setValue(element.name, next);

        if (!element.onChange || interactionsDisabled) {
            return;
        }

        onAction({
            actionId: element.onChange,
            formValues: {...values, [element.name]: next},
        });
    }, [element.name, element.onChange, interactionsDisabled, onAction, setValue, values]);

    const minDateConfig = element.datetime_config?.min_date;
    const maxDateConfig = element.datetime_config?.max_date;
    const resolvedMinDate = minDateConfig ? resolveRelativeDate(minDateConfig, displayTimezone) : undefined;
    const resolvedMaxDate = maxDateConfig ? resolveRelativeDate(maxDateConfig, displayTimezone) : undefined;
    const allowPastDates = useMemo(() => {
        if (!minDateConfig || !resolvedMinDate) {
            return true;
        }
        const minMoment = parseDateInTimezone(resolvedMinDate, displayTimezone);
        return !minMoment || minMoment.isBefore(getCurrentMomentForTimezone(displayTimezone), 'day');
    }, [minDateConfig, resolvedMinDate, displayTimezone]);

    const value = normalizeDateTimeValue(values[element.name] ?? element.initial_value);
    const selectedDate = useMemo(() => getDateValue(value, displayTimezone, true), [value, displayTimezone]);

    if (!element.name) {
        return null;
    }

    return (
        <View style={style.container}>
            {Boolean(element.label?.trim()) && (
                <Label
                    label={element.label ?? ''}
                    optional={element.optional === true}
                    testID={`mm_blocks.datetime_input.${element.name}`}
                />
            )}
            {selectedDate && (
                <View style={style.dateDisplay}>
                    <Text style={style.dateText}>
                        <FormattedDate
                            value={selectedDate.toDate()}
                            format={{dateStyle: 'medium'}}
                        />
                        {` ${intl.formatMessage({id: 'date_time_selector.at', defaultMessage: 'at'})} `}
                        <FormattedTime
                            isMilitaryTime={isMilitaryTime}
                            timezone={displayTimezone}
                            value={selectedDate.toDate()}
                        />
                    </Text>
                </View>
            )}
            {showTimezoneIndicator && (
                <View style={style.timezoneIndicator}>
                    <FormattedText
                        style={style.timezoneText}
                        id='date_time_selector.times_in'
                        defaultMessage='Times in {timezone}'
                        values={{timezone: timezoneAbbr}}
                    />
                </View>
            )}
            <DateTimeSelector
                timezone={displayTimezone}
                isMilitaryTime={isMilitaryTime}
                theme={theme}
                handleChange={handleChange}
                initialDate={selectedDate ?? undefined}
                dateOnly={false}
                allowPastDates={allowPastDates}
                minDate={resolvedMinDate}
                maxDate={resolvedMaxDate}
                minuteInterval={element.datetime_config?.time_interval || DEFAULT_TIME_INTERVAL_MINUTES}
                allowManualTimeEntry={element.datetime_config?.manual_time_entry}
                testID={`mm_blocks.datetime_input.${element.name}`}
            />
            {Boolean(element.help_text) && (
                <Text style={style.helpText}>{element.help_text}</Text>
            )}
            <MmBlocksFieldError name={element.name}/>
        </View>
    );
};

export default DateTimeInputElement;
