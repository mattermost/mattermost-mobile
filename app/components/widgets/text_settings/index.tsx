// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Platform} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import DisableContent from './components/disabled_content';
import HelpContent from './components/help_content';

export interface IntlText {
    id: string;
    defaultMessage: string;
}

type TextSettingProps = {
    disabled?: boolean;
    disabledText?: string;
    errorText?: string;
    helpText?: string | number;
    id: string;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
    label: IntlText | string;
    maxLength?: number;
    multiline?: boolean;
    onChange: (id: string, value: string) => void;
    onBlur?: (id: string) => void;
    optional?: boolean;
    secureTextEntry?: boolean;
    testID: string;
    value: string;
};

const TextSetting = ({
    disabled = false,
    disabledText,
    errorText,
    helpText,
    id,
    keyboardType = 'default',
    label,
    maxLength,
    multiline = false,
    onChange,
    optional = false,
    secureTextEntry = false,
    testID,
    value,
    onBlur,
}: TextSettingProps) => {
    const theme = useTheme();
    const intl = useIntl();

    const onChangeText = useCallback((text: string) => {
        return onChange(id, text);
    }, []);

    const onBlurField = useCallback(() => {
        return onBlur?.(id);
    }, []);

    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const blockStyles = getMarkdownBlockStyles(theme);

    const keyboard = Platform.OS === 'android' && keyboardType === 'url' ? 'default' : keyboardType;

    const labelText = typeof label === 'string' ? label : intl.formatMessage(label);
    const optionalText = optional ? intl.formatMessage({id: 'channel_modal.optional', defaultMessage: '(optional)'}) : ' *';

    const formattedLabel = labelText + optionalText;

    const viewContainerStyle = [
        style.viewContainer,
    ];

    if (errorText) {
        viewContainerStyle.push({
            marginBottom: 20,
        });
    }

    return (
        <View
            testID={testID}
            style={viewContainerStyle}
        >
            <View style={style.subContainer} >
                <FloatingTextInput
                    autoCapitalize='none'
                    autoCorrect={false}
                    disableFullscreenUI={true}
                    editable={!disabled}
                    error={errorText}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    keyboardType={keyboard}
                    label={formattedLabel}
                    maxLength={maxLength}
                    multiline={multiline}
                    onChangeText={onChangeText}
                    onBlur={onBlurField}
                    secureTextEntry={secureTextEntry}
                    testID={`${testID}.input`}
                    theme={theme}
                    value={value}
                />
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
                </View>
            </View>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        viewContainer: {
            marginVertical: 7,
            alignItems: 'center',
        },
        subContainer: {
            width: '84%',
        },
    };
});

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
