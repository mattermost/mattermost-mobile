// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Platform} from 'react-native';
import FloatingTextInput from 'react-native-reanimated-text-input';

import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import DisableContent from './components/disabled_content';
import ErrorContent from './components/error_content';
import HelpContent from './components/help_content';

export interface IntlText {
    id: string;
    defaultMessage: string;
}

type TextSettingProps = {
    disabled?: boolean;
    disabledText: string;
    errorText?: string | number;
    helpText?: string | number;
    id: string;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
    label: IntlText | string;
    maxLength?: number;
    multiline?: boolean;
    onChange: (id: string, value: string) => void;
    optional?: boolean;
    placeholder?: string;
    secureTextEntry?: boolean;
    testID: string;
    value: string;
};

const TextSetting = (props: TextSettingProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const {disabled, disabledText, errorText, helpText, id, keyboardType, label, maxLength, multiline, onChange, optional, placeholder, secureTextEntry, testID, value} = props;
    const onChangeText = useCallback((text: string) => {
        return onChange(id, text);
    }, []);

    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const blockStyles = getMarkdownBlockStyles(theme);

    const keyboard = Platform.OS === 'android' && keyboardType === 'url' ? 'default' : keyboardType;

    const labelText = typeof label === 'string' ? label : intl.formatMessage(label);
    const optionalText = optional ? intl.formatMessage({id: 'channel_modal.optional', defaultMessage: '(optional)'}) : ' *';

    const formattedLabel = labelText + optionalText;

    return (
        <View
            testID={testID}
            style={[style.viewContainer,
                {
                    alignItems: 'center',
                },
            ]}
        >
            <View style={{width: '84%'}} >
                <FloatingTextInput
                    activeColor={changeOpacity(theme.centerChannelColor, 0.64)}
                    activeLabelColor={changeOpacity(theme.centerChannelColor, 0.64)}
                    textInputColorStyles={{
                        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
                    }}
                    autoCapitalize='none'
                    autoCorrect={false}

                    // containerStyle={{width: '84%', marginLeft: 14}}
                    disableFullscreenUI={true}
                    editable={!disabled}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    keyboardType={keyboard}
                    label={formattedLabel}
                    maxLength={maxLength}
                    multiline={multiline}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    secureTextEntry={secureTextEntry}
                    testID={`${testID}.input`}
                    underlineColorAndroid='transparent'
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
                    {errorText && (
                        <ErrorContent
                            blockStyles={blockStyles}
                            errorText={errorText}
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
