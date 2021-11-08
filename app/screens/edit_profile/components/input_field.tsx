// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Platform, ViewStyle} from 'react-native';

import FloatingTextInput from '@components/floating_text_input_label/animated_input';
import {useTheme} from '@context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';

import MarkdownContent from './input_field_description';

type InputFieldProps = {
    containerStyle?: ViewStyle;
    disabled?: boolean;
    error?: string;
    fieldDescription?: string;
    id: string;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
    label: MessageDescriptor | string;
    maxLength?: number;
    multiline?: boolean;
    onBlur?: (id: string) => void;
    onChange: (id: string, value: string) => void;
    optional?: boolean;
    secureTextEntry?: boolean;
    subContainerStyle?: ViewStyle;
    testID: string;
    value: string;
};

const InputField = ({
    containerStyle,
    disabled = false,
    error,
    fieldDescription,
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
}: InputFieldProps) => {
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
                    {disabled && fieldDescription && (
                        <MarkdownContent
                            blockStyles={blockStyles}
                            text={fieldDescription}
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
export default InputField;
