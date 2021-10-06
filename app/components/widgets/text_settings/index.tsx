// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {View, TextInput, Platform} from 'react-native';

import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import DisableContent from './components/disabled_content';
import ErrorContent from './components/error_content';
import HelpContent from './components/help_content';
import LabelContent from './components/label_content';
import OptionalContent from './components/optional_content';

export interface IntlText {
    id: string;
    defaultMessage: string;
}

type TextSettingProps = {
    disabled: boolean;
    disabledText: string;
    errorText: string | number;
    helpText: string | number;
    id: string;
    keyboardType: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
    label: IntlText | string;
    maxLength: number;
    multiline: boolean;
    onChange: (id: string, value: string) => void;
    optional: boolean;
    placeholder: string;
    secureTextEntry: boolean;
    testID: string;
    value: string;
};

const TextSetting = (props: TextSettingProps) => {
    const theme = useTheme();
    const {disabled, disabledText, errorText, helpText, id, keyboardType, label, maxLength, multiline, onChange, optional, placeholder, secureTextEntry, testID, value} = props;

    const onChangeText = useCallback((text: string) => {
        return onChange(id, text);
    }, []);

    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const blockStyles = getMarkdownBlockStyles(theme);

    const keyboard = Platform.OS === 'android' && keyboardType === 'url' ? 'default' : keyboardType;

    const inputStyle = multiline ? style.multiline : style.input;
    const noEditing = disabled ? style.disabled : null;

    return (
        <View testID={testID}>
            <View style={style.titleContainer}>
                <LabelContent
                    label={label}
                    testID={testID}
                />
                <OptionalContent optional={optional}/>
            </View>
            <View style={[style.inputContainer, noEditing]}>
                <View>
                    <TextInput
                        autoCapitalize='none'
                        autoCorrect={false}
                        disableFullscreenUI={true}
                        editable={!disabled}
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        keyboardType={keyboard}
                        maxLength={maxLength}
                        multiline={multiline}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        secureTextEntry={secureTextEntry}
                        style={inputStyle}
                        testID={`${testID}.input`}
                        underlineColorAndroid='transparent'
                        value={value}
                    />
                </View>
            </View>
            <View>
                {disabled && disabledText && (
                    <DisableContent
                        blockStyles={blockStyles}
                        disabledText={disabledText}
                        textStyles={textStyles}
                    />
                )}
                {helpText && (
                    <HelpContent
                        blockStyles={blockStyles}
                        helpText={helpText}
                        textStyles={textStyles}
                    />
                )}
                {errorText && (
                    <ErrorContent
                        blockStyles={blockStyles}
                        errorText={errorText}
                        textStyles={textStyles}
                    />
                )}
            </View>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const input = {
        color: theme.centerChannelColor,
        fontSize: 14,
        paddingHorizontal: 15,
    };

    return {
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            ...input,
            height: 40,
        },
        multiline: {
            ...input,
            paddingTop: 10,
            paddingBottom: 13,
            height: 125,
        },
        disabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        titleContainer: {
            flexDirection: 'row',
            marginTop: 15,
            marginBottom: 10,
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
    };
});

TextSetting.defaultProps = {
    optional: false,
    disabled: false,
    multiline: false,
    keyboardType: 'default',
    secureTextEntry: false,
};

TextSetting.validTypes = [
    'input',
    'textarea',
    'number',
    'email',
    'tel',
    'url',
    'password',
];

export default memo(TextSetting);
