// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Platform, ViewStyle} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import MarkdownContent from './components/markdown_content';

export interface IntlText {
    id: string;
    defaultMessage: string;
}

type FieldProps = {
    containerStyle?: ViewStyle;
    disabled?: boolean;
    disabledText?: string;
    error?: string;
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
    subContainerStyle?: ViewStyle;
    testID: string;
    value: string;
};

const Field = ({
    containerStyle,
    disabled = false,
    disabledText,
    error,
    helpText,
    id,
    keyboardType = 'default',
    label,
    maxLength,
    multiline = false,
    onBlur,
    onChange,
    optional = false,
    secureTextEntry = false,
    subContainerStyle,
    testID,
    value,
}: FieldProps) => {
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

    if (error) {
        viewContainerStyle.push({
            marginBottom: 20,
        });
    }

    return (
        <View
            testID={testID}
            style={[viewContainerStyle, containerStyle]}
        >
            <View style={[style.subContainer, subContainerStyle]} >
                <FloatingTextInput
                    autoCapitalize='none'
                    autoCorrect={false}
                    disableFullscreenUI={true}
                    editable={!disabled}
                    error={error}
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
                        <MarkdownContent
                            blockStyles={blockStyles}
                            text={disabledText}
                            textStyles={textStyles}
                        />
                    )}
                    {helpText && (
                        <MarkdownContent
                            blockStyles={blockStyles}
                            text={helpText}
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
            width: '100%',
        },
        subContainer: {
            width: '84%',
        },
    };
});
export default memo(Field);
