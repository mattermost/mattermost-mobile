// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment, {type Moment} from 'moment-timezone';
import React, {useCallback, useMemo} from 'react';
import {View, Text} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import DateTimeSelector from '@components/date_time_selector';
import FormattedDate from '@components/formatted_date';
import FormattedTime from '@components/formatted_time';
import Markdown from '@components/markdown';
import BoolSetting from '@components/settings/bool_setting';
import RadioSetting from '@components/settings/radio_setting';
import TextSetting from '@components/settings/text_setting';
import {Screens, View as ViewConstants} from '@constants';
import {AppFieldTypes, SelectableAppFieldTypes} from '@constants/apps';
import {useTheme} from '@context/theme';
import {isAppSelectOption} from '@utils/dialog_utils';
import {selectKeyboardType} from '@utils/integrations';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

export type Props = {
    field: AppField;
    name: string;
    errorText?: string;
    value: AppFormValue;
    onChange: (name: string, value: AppFormValue) => void;
    performLookup: (name: string, userInput: string) => Promise<AppSelectOption[]>;
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

const getDateValue = (value: AppFormValue): Moment | undefined => {
    if (typeof value === 'string' && value) {
        const parsed = moment(value);
        return parsed.isValid() ? parsed : undefined;
    }
    return undefined;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        markdownFieldContainer: {
            marginTop: 15,
            marginBottom: 10,
            marginLeft: 15,
        },
        markdownFieldText: {
            fontSize: 14,
            color: theme.centerChannelColor,
        },
    };
});

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

const AppsFormField = React.memo<Props>(({
    field,
    name,
    errorText,
    value,
    onChange,
    performLookup,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const testID = `AppFormElement.${name}`;
    const placeholder = field.hint || '';
    const displayName = field.modal_label || field.label || '';

    const handleChange = useCallback((newValue: string | boolean) => {
        onChange(name, newValue);
    }, [onChange, name]);

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

    const handleDateChange = useCallback((selectedDate: Moment) => {
        if (field.type === AppFieldTypes.DATE) {
            // For date-only fields, return YYYY-MM-DD format
            onChange(name, selectedDate.format('YYYY-MM-DD'));
        } else if (field.type === AppFieldTypes.DATETIME) {
            // For datetime fields, return full ISO string
            onChange(name, selectedDate.toISOString());
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
                    showRequiredAsterisk={true}
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
                        mentionKeys={[]}
                        disableAtMentions={true}
                        location={Screens.APPS_FORM}
                        blockStyles={getMarkdownBlockStyles(theme)}
                        textStyles={getMarkdownTextStyles(theme)}
                        baseTextStyle={style.markdownFieldText}
                        theme={theme}
                    />
                </View>
            );
        }
        case AppFieldTypes.DATE:
        case AppFieldTypes.DATETIME: {
            const selectedDate = getDateValue(value) || moment();
            const hasValue = Boolean(value);

            const dateTimeStyles = {
                container: {
                    marginBottom: 24,
                },
                labelContainer: {
                    flexDirection: 'row' as const,
                    marginTop: 15,
                    marginBottom: 10,
                    marginLeft: 15,
                    position: 'relative' as const,
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
                    position: 'absolute' as const,
                    right: 14,
                },
                dateTimeText: {
                    color: theme.linkColor,
                    fontSize: 14,
                },
                helpText: {
                    fontSize: 12,
                    color: theme.centerChannelColor,
                    marginLeft: 15,
                    marginTop: 4,
                    opacity: 0.64,
                },
                errorText: {
                    fontSize: 12,
                    color: theme.errorTextColor,
                    marginLeft: 15,
                    marginTop: 4,
                },
            };

            return (
                <View style={dateTimeStyles.container}>
                    <View style={dateTimeStyles.labelContainer}>
                        <Text style={dateTimeStyles.label}>
                            {displayName}
                            {field.is_required && <Text style={dateTimeStyles.asterisk}>{' *'}</Text>}
                        </Text>

                        {hasValue && (
                            <View style={dateTimeStyles.rightPosition}>
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

                    <DateTimeSelector
                        timezone={'UTC'}
                        theme={theme}
                        handleChange={handleDateChange}
                        initialDate={selectedDate}
                        dateOnly={field.type === AppFieldTypes.DATE}
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

AppsFormField.displayName = 'AppsFormField';

export default AppsFormField;
