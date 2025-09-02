// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useMemo} from 'react';
import {View, Text, type KeyboardTypeOptions} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import DateTimePicker from '@components/data_time_selector';
import FormattedDate from '@components/formatted_date';
import FormattedTime from '@components/formatted_time';
import BoolSetting from '@components/settings/bool_setting';
import RadioSetting from '@components/settings/radio_setting';
import TextSetting from '@components/settings/text_setting';
import {Screens} from '@constants';
import {selectKeyboardType as selectKB} from '@utils/integrations';
import {filterOptions} from '@utils/message_attachment';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

const getDateTimeStyles = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginBottom: 24,
        },
        labelContainer: {
            flexDirection: 'row',
            marginTop: 15,
            marginBottom: 10,
            marginLeft: 15,
            position: 'relative',
            flex: 1,
        },
        label: {
            fontSize: 14,
            color: theme.centerChannelColor,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
        rightPosition: {
            position: 'absolute',
            right: 14,
        },
        dateTimeText: {
            color: theme.linkColor,
            fontSize: 14,
        },
        helpText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            marginLeft: 15,
            marginTop: 4,
        },
        errorText: {
            fontSize: 12,
            color: theme.errorTextColor,
            marginLeft: 15,
            marginTop: 4,
        },
    };
});

function selectKeyboardType(type: InteractiveDialogElementType, subtype?: InteractiveDialogTextSubtype): KeyboardTypeOptions {
    if (type === 'textarea') {
        return 'default';
    }

    return selectKB(subtype);
}

function getStringValue(value: string | number | boolean | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return value.toString();
    }

    return undefined;
}

function getBooleanValue(value: string | number | boolean | string[] | undefined): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function getDateValue(value: string | number | boolean | string[] | undefined): Moment | undefined {
    if (typeof value === 'string' && value) {
        const parsed = moment(value);
        return parsed.isValid() ? parsed : undefined;
    }
    return undefined;
}

type Props = {
    displayName: string;
    name: string;
    type: InteractiveDialogElementType;
    subtype?: InteractiveDialogTextSubtype;
    placeholder?: string;
    helpText?: string;
    errorText?: string;
    maxLength?: number;
    dataSource?: string;
    optional?: boolean;
    options?: PostActionOption[];
    multiselect?: boolean;
    value?: string|number|boolean|string[];
    onChange: (name: string, value: string|number|boolean|string[]) => void;
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    theme: Theme;
}
function DialogElement({
    displayName,
    name,
    type,
    subtype,
    placeholder,
    helpText,
    errorText,
    maxLength,
    dataSource,
    optional = false,
    options,
    multiselect = false,
    value,
    onChange,
    getDynamicOptions,
    theme,
}: Props) {
    const testID = `InteractiveDialogElement.${name}`;
    const handleChange = useCallback((newValue: string | boolean | string[]) => {
        if (type === 'text' && subtype === 'number') {
            const number = parseInt(newValue as string, 10);
            onChange(name, isNaN(number) ? '' : number);
            return;
        }
        onChange(name, newValue);
    }, [type, subtype, onChange, name]);

    const handleSelect = useCallback((newValue: SelectedDialogOption) => {
        if (!newValue) {
            onChange(name, multiselect ? [] : '');
            return;
        }

        if (Array.isArray(newValue)) {
            // Multiselect: return array of values
            onChange(name, newValue.map((option) => option.value));
        } else {
            // Single select: return single value
            onChange(name, newValue.value);
        }
    }, [name, onChange, multiselect]);

    const handleDateChange = useCallback((selectedDate: Moment) => {
        if (type === 'date') {
            // For date-only fields, return YYYY-MM-DD format
            onChange(name, selectedDate.format('YYYY-MM-DD'));
        } else if (type === 'datetime') {
            // For datetime fields, return full ISO string
            onChange(name, selectedDate.toISOString());
        }
    }, [name, onChange, type]);

    const filteredOptions = useMemo(() => {
        return filterOptions(options);
    }, [options]);

    switch (type) {
        case 'text':
        case 'textarea':
            return (
                <TextSetting
                    label={displayName}
                    maxLength={maxLength || (type === 'text' ? TEXT_DEFAULT_MAX_LENGTH : TEXTAREA_DEFAULT_MAX_LENGTH)}
                    value={getStringValue(value)}
                    placeholder={placeholder}
                    helpText={helpText}
                    errorText={errorText}
                    onChange={handleChange}
                    optional={optional}
                    multiline={type === 'textarea'}
                    keyboardType={selectKeyboardType(type, subtype)}
                    secureTextEntry={subtype === 'password'}
                    disabled={false}
                    testID={testID}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'select':
            return (
                <AutocompleteSelector
                    label={displayName}
                    dataSource={dataSource}
                    options={filteredOptions}
                    optional={optional}
                    onSelected={handleSelect}
                    getDynamicOptions={getDynamicOptions}
                    helpText={helpText}
                    errorText={errorText}
                    placeholder={placeholder}
                    showRequiredAsterisk={true}
                    selected={multiselect && Array.isArray(value) ? value : getStringValue(value)}
                    isMultiselect={multiselect}
                    roundedBorders={false}
                    testID={testID}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'radio':
            return (
                <RadioSetting
                    label={displayName}
                    helpText={helpText}
                    errorText={errorText}
                    options={filteredOptions}
                    onChange={handleChange}
                    testID={testID}
                    value={getStringValue(value)}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'bool':
            return (
                <BoolSetting
                    label={displayName}
                    value={getBooleanValue(value)}
                    placeholder={placeholder}
                    helpText={helpText}
                    errorText={errorText}
                    optional={optional}
                    onChange={handleChange}
                    testID={testID}
                    location={Screens.INTERACTIVE_DIALOG}
                />
            );
        case 'date':
        case 'datetime': {

            const selectedDate = getDateValue(value) || moment();
            const dateTimeStyles = getDateTimeStyles(theme);
            const hasValue = Boolean(value);

            return (
                <View style={dateTimeStyles.container}>
                    {/* Label with datetime display using custom status pattern */}
                    <View style={dateTimeStyles.labelContainer}>
                        <Text style={dateTimeStyles.label}>
                            {displayName}
                            {!optional && <Text style={dateTimeStyles.asterisk}>{' *'}</Text>}
                        </Text>

                        {hasValue && (
                            <View style={dateTimeStyles.rightPosition}>
                                {type === 'date' ? (
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
                                        {' at '}
                                        <FormattedTime
                                            isMilitaryTime={false}
                                            timezone={''}
                                            value={selectedDate.toDate()}
                                        />
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* DateTimePicker for changing the value */}
                    <DateTimePicker
                        timezone={null}
                        theme={theme}
                        handleChange={handleDateChange}
                        initialDate={selectedDate}
                        dateOnly={type === 'date'}
                    />

                    {/* Help and error text */}
                    {helpText && (
                        <Text style={dateTimeStyles.helpText}>
                            {helpText}
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
        default:
            return null;
    }
}

export default DialogElement;
