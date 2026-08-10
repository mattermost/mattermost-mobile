// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useContext, useEffect, useMemo} from 'react';
import {Text, View} from 'react-native';

import DateTimeSelector from '@components/date_time_selector';
import FormattedDate from '@components/formatted_date';
import Label from '@components/settings/label';
import {getDateValue, isRelativeDate, parseDateInTimezone, resolveRelativeDate} from '@utils/date_utils';
import {getCurrentMomentForTimezone} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {MmBlocksInteractionsDisabledContext} from '../context';
import {MmBlocksFieldError, useMmBlocksForm} from '../form';

import type {ActionHandler} from '../types';
import type {Moment} from 'moment-timezone';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    dateDisplay: {marginLeft: 15, marginBottom: 8},
    dateText: {color: theme.linkColor, ...typography('Body', 100, 'Regular')},
    dateTextDisabled: {color: changeOpacity(theme.linkColor, 0.5)},
    helpText: {color: theme.centerChannelColor, marginLeft: 15, marginTop: 4, opacity: 0.64, ...typography('Body', 75, 'Regular')},
}));

export type DateInputElementProps = {
    element: MmDateInputBlock;
    onAction: ActionHandler;
    theme: Theme;
    userTimezone: string;
};

function normalizeDateValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

const DateInputElement = ({element, onAction, theme, userTimezone}: DateInputElementProps) => {
    const interactionsDisabled = useContext(MmBlocksInteractionsDisabledContext);
    const disabled = interactionsDisabled || element.disabled === true;
    const {values, setValue, setDefaultValue} = useMmBlocksForm();
    const style = getStyleSheet(theme);

    useEffect(() => {
        if (!element.name) {
            return;
        }
        const raw = element.initial_value ?? '';
        if (!raw) {
            setDefaultValue(element.name, '');
            return;
        }

        // Relative defaults (today, +1d, …) must be stored as YYYY-MM-DD for submit validation.
        if (isRelativeDate(raw)) {
            const resolved = getDateValue(raw, userTimezone, false);
            setDefaultValue(element.name, resolved ? resolved.format('YYYY-MM-DD') : raw);
            return;
        }

        setDefaultValue(element.name, raw);
    }, [element.name, element.initial_value, setDefaultValue, userTimezone]);

    const handleChange = useCallback((picked: Moment) => {
        if (disabled) {
            return;
        }

        const next = picked.clone().startOf('day').format('YYYY-MM-DD');
        setValue(element.name, next);

        if (!element.onChange) {
            return;
        }

        onAction({
            actionId: element.onChange,
            formValues: {...values, [element.name]: next},
        });
    }, [disabled, element.name, element.onChange, onAction, setValue, values]);

    const minDateConfig = element.datetime_config?.min_date;
    const maxDateConfig = element.datetime_config?.max_date;
    const resolvedMinDate = minDateConfig ? resolveRelativeDate(minDateConfig, userTimezone) : undefined;
    const resolvedMaxDate = maxDateConfig ? resolveRelativeDate(maxDateConfig, userTimezone) : undefined;
    const allowPastDates = useMemo(() => {
        if (!minDateConfig || !resolvedMinDate) {
            return true;
        }
        const minMoment = parseDateInTimezone(resolvedMinDate, userTimezone);
        return !minMoment || minMoment.isBefore(getCurrentMomentForTimezone(userTimezone), 'day');
    }, [minDateConfig, resolvedMinDate, userTimezone]);

    const value = normalizeDateValue(values[element.name] ?? element.initial_value);
    const selectedDate = useMemo(() => getDateValue(value, userTimezone, false), [value, userTimezone]);

    if (!element.name) {
        return null;
    }

    return (
        <View>
            {Boolean(element.label?.trim()) && (
                <Label
                    label={element.label ?? ''}
                    optional={element.optional === true}
                    testID={`mm_blocks.date_input.${element.name}`}
                />
            )}
            {selectedDate && (
                <View style={style.dateDisplay}>
                    <FormattedDate
                        value={selectedDate.toDate()}
                        format={{dateStyle: 'medium'}}
                        style={[style.dateText, disabled && style.dateTextDisabled]}
                    />
                </View>
            )}
            <DateTimeSelector
                timezone={userTimezone}
                isMilitaryTime={false}
                theme={theme}
                handleChange={handleChange}
                initialDate={selectedDate ?? undefined}
                dateOnly={true}
                allowPastDates={allowPastDates}
                minDate={resolvedMinDate}
                maxDate={resolvedMaxDate}
                allowManualTimeEntry={element.datetime_config?.manual_time_entry}
                disabled={disabled}
                testID={`mm_blocks.date_input.${element.name}`}
            />
            {Boolean(element.help_text) && (
                <Text style={style.helpText}>{element.help_text}</Text>
            )}
            <MmBlocksFieldError name={element.name}/>
        </View>
    );
};

export default DateInputElement;
