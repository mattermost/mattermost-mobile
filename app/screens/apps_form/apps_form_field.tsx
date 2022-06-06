// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import AutocompleteSelector from '@components/autocomplete_selector';
import Markdown from '@components/markdown';
import BoolSetting from '@components/settings/bool_setting';
import TextSetting from '@components/settings/text_setting';
import {View as ViewConstants} from '@constants';
import {AppFieldTypes} from '@constants/apps';
import {useTheme} from '@context/theme';
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
    onChange: (name: string, value: string | string[] | boolean) => void;
    performLookup: (name: string, userInput: string) => Promise<AppSelectOption[]>;
}

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

function AppsFormField({
    field,
    name,
    errorText,
    value,
    onChange,
    performLookup,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const testID = `AppFormElement.${name}`;
    const placeholder = field.hint || '';
    const displayName = field.modal_label || field.label || '';

    const handleChange = useCallback((newValue: string | boolean | string[]) => {
        onChange(name, newValue);
    }, [name]);

    const getDynamicOptions = useCallback(async (userInput = ''): Promise<DialogOption[]> => {
        const options = await performLookup(field.name, userInput);
        return options.map((option) => ({
            text: option.label,
            value: option.value,
        }));
    }, [performLookup, field]);

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
                />
            );
        }
        case AppFieldTypes.USER:
        case AppFieldTypes.CHANNEL:
        case AppFieldTypes.STATIC_SELECT:
        case AppFieldTypes.DYNAMIC_SELECT: {
            let options: DialogOption[] | undefined;
            if (field.type === AppFieldTypes.STATIC_SELECT && field.options) {
                options = field.options.map((option) => ({text: option.label, value: option.value}));
            }

            return (
                <AutocompleteSelector
                    label={displayName}
                    dataSource={selectDataSource(field.type)}
                    options={options}
                    optional={!field.is_required}
                    onSelected={handleChange}
                    getDynamicOptions={getDynamicOptions}
                    helpText={field.description}
                    errorText={errorText}
                    placeholder={placeholder}
                    showRequiredAsterisk={true}
                    selected={value as string | string[]}
                    roundedBorders={false}
                    disabled={field.readonly}
                    isMultiselect={field.multiselect}
                    testID={testID}
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
                        location=''
                        blockStyles={getMarkdownBlockStyles(theme)}
                        textStyles={getMarkdownTextStyles(theme)}
                        baseTextStyle={style.markdownFieldText}
                        theme={theme}
                    />
                </View>
            );
        }
    }

    return null;
}

export default AppsFormField;
