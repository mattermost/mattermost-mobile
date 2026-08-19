// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import DateTimeSelector from '@components/date_time_selector';
import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Markdown from '@components/markdown';
import BoolSetting from '@components/settings/bool_setting';
import RadioSetting from '@components/settings/radio_setting';
import TextSetting from '@components/settings/text_setting';
import {Screens, View as ViewConstants} from '@constants';
import {AppFieldTypes, DEFAULT_TIME_INTERVAL_MINUTES, SelectableAppFieldTypes} from '@constants/apps';
import {useTheme} from '@context/theme';
import {getDateValue, parseDateInTimezone, resolveRelativeDate} from '@utils/date_utils';
import {isAppSelectOption} from '@utils/dialog_utils';
import {getCurrentMomentForTimezone} from '@utils/helpers';
import {selectKeyboardType} from '@utils/integrations';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

export type Props = {
    field: AppField;
    name: string;
    errorText?: string;
    value: AppFormValue;
    onChange: (name: string, value: AppFormValue) => void;
    performLookup: (name: string, userInput: string) => Promise<AppSelectOption[]>;
    userTimezone: string;
    isMilitaryTime: boolean;
}

const dialogOptionToAppSelectOption = (option: DialogOption): AppSelectOption => ({
    label: option.text,
    value: option.value,
});

const appSelectOptionToDialogOption = (option: AppSelectOption): DialogOption => ({
    text: option.label || '',
    value: option.value || '',
});

const extractOptionValue = (v: AppSelectOption) => v.value || '';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        markdownFieldContainer: {
            marginTop: 15,
            marginBottom: 10,
            marginLeft: 15,
        },
        markdownFieldText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
    };
});

const getDateTimeStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {marginBottom: 24},
    labelContainer: {flexDirection: 'row', marginTop: 15, marginBottom: 10, marginLeft: 15, marginRight: 15, alignItems: 'center', justifyContent: 'space-between'},
    label: {color: theme.centerChannelColor, flexShrink: 1, marginRight: 8, ...typography('Body', 100, 'Regular')},
    asterisk: {color: theme.errorTextColor, ...typography('Body', 100, 'Regular')},
    dateTimeDisplay: {flexShrink: 0},
    dateTimeText: {color: theme.linkColor, ...typography('Body', 100, 'Regular')},
    helpText: {color: theme.centerChannelColor, marginLeft: 15, marginTop: 4, opacity: 0.64, ...typography('Body', 75, 'Regular')},
    errorText: {color: theme.errorTextColor, marginLeft: 15, marginTop: 4, ...typography('Body', 75, 'Regular')},
    timezoneIndicator: {flexDirection: 'row', alignItems: 'center', marginLeft: 15, marginBottom: 8, marginTop: -4},
    timezoneText: {color: theme.centerChannelColor, opacity: 0.64, marginLeft: 4, ...typography('Body', 75, 'Regular')},
}));

function selectDataSource(fieldType: string): string {
    switch (fieldType) {
        case AppFieldTypes.USER:
            return ViewConstants.DATA_SOURCE_USERS;
        case AppFieldTypes.CHANNEL:
            return ViewConstants.DATA_SOURCE_CHANNELS;
        case AppFieldTypes.DYNAMIC_SELECT:
            return ViewConstants.DATA_SOURCE_DYNAMIC;
        default:
            return '';
    }
}

const AppsFormFieldComponent = React.memo(({
    field,
    name,
    errorText,
    value,
    onChange,
    performLookup,
    userTimezone,
    isMilitaryTime,
}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const style = getStyleSheet(theme);
    const dateTimeStyles = getDateTimeStyleSheet(theme);

    const isDateTimeField = field.type === AppFieldTypes.DATETIME;
    const isDateField = field.type === AppFieldTypes.DATE || isDateTimeField;
    const locationTimezone = field.datetime_config?.location_timezone;
    const displayTimezone = locationTimezone || userTimezone;
    const showTimezoneIndicator = Boolean(locationTimezone);
    const resolvedMinDate = isDateField && field.min_date ? resolveRelativeDate(field.min_date, displayTimezone) : undefined;
    const resolvedMaxDate = isDateField && field.max_date ? resolveRelativeDate(field.max_date, displayTimezone) : undefined;
    const allowPastDates = useMemo(() => {
        if (!isDateField || !field.min_date || !resolvedMinDate) {
            return true;
        }
        const minMoment = parseDateInTimezone(resolvedMinDate, displayTimezone);
        return !minMoment || minMoment.isBefore(getCurrentMomentForTimezone(displayTimezone), 'day');
    }, [isDateField, field.min_date, resolvedMinDate, displayTimezone]);
    const selectedDate = useMemo(
        () => (isDateField ? (getDateValue(value, displayTimezone, isDateTimeField) ?? moment()) : null),
        [isDateField, value, displayTimezone, isDateTimeField],
    );

    const testID = `AppFormElement.${name}`;
    const placeholder = field.hint || '';
    const displayName = field.modal_label || field.label || '';

    const handleChange = useCallback((newValue: string | boolean) => {
        onChange(name, newValue);
    }, [name, onChange]);

    const handleSelect = useCallback((newValue: SelectedDialogOption) => {
        if (!newValue) {
            const emptyValue = field.multiselect ? [] : '';
            onChange(name, emptyValue);
            return;
        }

        if (Array.isArray(newValue)) {
            const selectedOptions = newValue.map(dialogOptionToAppSelectOption);
            onChange(name, selectedOptions);
            return;
        }

        onChange(name, dialogOptionToAppSelectOption(newValue));
    }, [onChange, field, name]);

    const handleDateChange = useCallback((pickedDate: Moment) => {
        if (field.type === AppFieldTypes.DATE) {
            // For date-only fields, use start of day to avoid timezone issues
            const startOfDay = pickedDate.clone().startOf('day');
            const dateString = startOfDay.format('YYYY-MM-DD');
            onChange(name, dateString);
        } else if (field.type === AppFieldTypes.DATETIME) {
            // For datetime fields, return full ISO string
            onChange(name, pickedDate.toISOString());
        }
    }, [name, onChange, field.type]);

    const getDynamicOptions = useCallback(async (userInput = ''): Promise<DialogOption[]> => {
        if (!field.name) {
            return [];
        }
        const options = await performLookup(field.name, userInput);
        return options.map(appSelectOptionToDialogOption);
    }, [performLookup, field]);

    const options = useMemo(() => {
        if (field.type === AppFieldTypes.STATIC_SELECT) {
            return field.options?.map(appSelectOptionToDialogOption);
        }

        if (field.type === AppFieldTypes.DYNAMIC_SELECT) {
            if (!value) {
                return undefined;
            }

            if (Array.isArray(value)) {
                return value.map(appSelectOptionToDialogOption);
            }

            const selectedOption = value as AppSelectOption;
            return [appSelectOptionToDialogOption(selectedOption)];
        }

        return undefined;
    }, [field, value]);

    const selectedValue = useMemo(() => {
        if (!SelectableAppFieldTypes.includes(field.type || '')) {
            return undefined;
        }

        if (!value) {
            return undefined;
        }

        if (Array.isArray(value)) {
            return value.map(extractOptionValue);
        }

        // Handle AppSelectOption object
        if (isAppSelectOption(value)) {
            return value.value || '';
        }

        return value as string;
    }, [field, value]);

    switch (field.type) {
        case AppFieldTypes.TEXT: {
            return (
                <TextSetting
                    label={displayName}
                    maxLength={field.max_length || (field.subtype === 'textarea' ? TEXTAREA_DEFAULT_MAX_LENGTH : TEXT_DEFAULT_MAX_LENGTH)}
                    value={value as string}
                    placeholder={placeholder}
                    helpText={field.description}
                    errorText={errorText}
                    onChange={handleChange}
                    optional={!field.is_required}
                    multiline={field.subtype === 'textarea'}
                    keyboardType={selectKeyboardType(field.subtype)}
                    secureTextEntry={field.subtype === 'password'}

                    // Use 'oneTimeCode' for password fields so iOS doesn't treat the
                    // dialog as a login form and pop the "Save Password?" credential
                    // sheet on submit — these are arbitrary plugin fields, not app login
                    // credentials. The field stays masked via secureTextEntry.
                    textContentType={field.subtype === 'password' ? 'oneTimeCode' : undefined}
                    disabled={Boolean(field.readonly)}
                    testID={testID}
                    location={Screens.APPS_FORM}
                />
            );
        }
        case AppFieldTypes.USER:
        case AppFieldTypes.CHANNEL:
        case AppFieldTypes.STATIC_SELECT:
        case AppFieldTypes.DYNAMIC_SELECT: {
            return (
                <AutocompleteSelector
                    label={displayName}
                    dataSource={selectDataSource(field.type)}
                    options={options}
                    optional={!field.is_required}
                    onSelected={handleSelect}
                    getDynamicOptions={field.type === AppFieldTypes.DYNAMIC_SELECT ? getDynamicOptions : undefined}
                    helpText={field.description}
                    errorText={errorText}
                    placeholder={placeholder}
                    selected={selectedValue}
                    roundedBorders={false}
                    disabled={field.readonly}
                    isMultiselect={field.multiselect}
                    testID={testID}
                    location={Screens.APPS_FORM}
                />
            );
        }
        case AppFieldTypes.BOOL: {
            return (
                <BoolSetting
                    label={displayName}
                    value={value as boolean}
                    placeholder={placeholder}
                    helpText={field.description}
                    errorText={errorText}
                    optional={!field.is_required}
                    onChange={handleChange}
                    disabled={field.readonly}
                    testID={testID}
                    location={Screens.APPS_FORM}
                />
            );
        }
        case AppFieldTypes.RADIO: {
            return (
                <RadioSetting
                    label={displayName}
                    helpText={field.description}
                    errorText={errorText}
                    options={field.options?.map(appSelectOptionToDialogOption)}
                    onChange={handleChange}
                    testID={testID}
                    value={value as string}
                    location={Screens.APPS_FORM}
                />
            );
        }
        case AppFieldTypes.MARKDOWN: {
            if (!field.description) {
                return null;
            }

            return (
                <View
                    style={style.markdownFieldContainer}
                >
                    <Markdown
                        value={field.description}
                        disableAtMentions={true}
                        location={Screens.APPS_FORM}
                        baseTextStyle={style.markdownFieldText}
                        theme={theme}
                    />
                </View>
            );
        }
        case AppFieldTypes.DATE:
        case AppFieldTypes.DATETIME: {
            const hasValue = Boolean(value);
            const timezoneAbbr = showTimezoneIndicator ? moment.tz(displayTimezone).format('z') : '';

            return (
                <View style={dateTimeStyles.container}>
                    <View style={dateTimeStyles.labelContainer}>
                        <Text
                            style={dateTimeStyles.label}
                            numberOfLines={1}
                            ellipsizeMode='tail'
                        >
                            {displayName}
                            {field.is_required && <Text style={dateTimeStyles.asterisk}>{' *'}</Text>}
                        </Text>

                        {hasValue && selectedDate && (
                            <View style={dateTimeStyles.dateTimeDisplay}>
                                {field.type === AppFieldTypes.DATE ? (
                                    <FormattedDate
                                        value={selectedDate.toDate()}
                                        format={{dateStyle: 'medium'}}
                                        style={dateTimeStyles.dateTimeText}
                                    />
                                ) : (
                                    <Text style={dateTimeStyles.dateTimeText}>
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
                                )}
                            </View>
                        )}
                    </View>

                    {showTimezoneIndicator && (
                        <View style={dateTimeStyles.timezoneIndicator}>
                            <FormattedText
                                style={dateTimeStyles.timezoneText}
                                id='date_time_selector.times_in'
                                defaultMessage='Times in {timezone}'
                                values={{timezone: timezoneAbbr}}
                            />
                        </View>
                    )}

                    <DateTimeSelector
                        timezone={displayTimezone}
                        theme={theme}
                        handleChange={handleDateChange}
                        initialDate={hasValue && selectedDate ? selectedDate : undefined}
                        dateOnly={field.type === AppFieldTypes.DATE}
                        allowPastDates={allowPastDates}
                        minDate={resolvedMinDate}
                        maxDate={resolvedMaxDate}
                        minuteInterval={field.datetime_config?.time_interval || field.time_interval || DEFAULT_TIME_INTERVAL_MINUTES}
                        allowManualTimeEntry={field.datetime_config?.allow_manual_time_entry}
                        testID={testID}
                    />

                    {field.description && (
                        <Text style={dateTimeStyles.helpText}>
                            {field.description}
                        </Text>
                    )}
                    {errorText && (
                        <Text style={dateTimeStyles.errorText}>
                            {errorText}
                        </Text>
                    )}
                </View>
            );
        }
    }

    return null;
});

AppsFormFieldComponent.displayName = 'AppsFormField';

export default AppsFormFieldComponent;
