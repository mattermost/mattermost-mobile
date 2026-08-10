// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform, View, type KeyboardTypeOptions, type TextInputProps} from 'react-native';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Footer from './footer';

import type {AvailableScreens} from '@typings/screens/navigation';

const MULTILINE_INPUT_HEIGHT = 125;

const messages = defineMessages({
    optional: {
        id: 'channel_modal.optional',
        defaultMessage: '(optional)',
    },
});

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    container: {
        width: '100%',
        marginTop: 12,
    },
}));

type Props = {
    label: string;
    placeholder?: string;
    helpText?: string;
    errorText?: string;
    disabled: boolean;
    disabledText?: string;
    maxLength?: number;
    optional: boolean;
    onChange: (value: string) => void;
    value?: string;
    multiline: boolean;
    keyboardType: KeyboardTypeOptions;
    secureTextEntry: boolean;
    textContentType?: TextInputProps['textContentType'];
    testID: string;
    location: AvailableScreens;
}

function TextSetting({
    label,
    placeholder,
    helpText,
    errorText,
    disabled,
    disabledText,
    maxLength,
    optional,
    onChange,
    value,
    multiline,
    keyboardType,
    secureTextEntry,
    textContentType,
    testID,
    location,
}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const actualKeyboardType: KeyboardTypeOptions = keyboardType === 'url' ? Platform.select({android: 'default', default: 'url'}) : keyboardType;

    const trimmedLabel = label?.trim();
    const floatingLabel = useMemo(() => {
        if (!trimmedLabel) {
            return '';
        }
        if (optional) {
            return `${trimmedLabel} ${intl.formatMessage(messages.optional)}`;
        }
        return `${trimmedLabel} *`;
    }, [intl, optional, trimmedLabel]);

    return (
        <View
            style={style.container}
            testID={testID}
        >
            <FloatingTextInput
                editable={!disabled}
                error={errorText}
                keyboardType={actualKeyboardType}
                label={floatingLabel}
                maxLength={maxLength}
                multiline={multiline}
                multilineInputHeight={multiline ? MULTILINE_INPUT_HEIGHT : undefined}
                onChangeText={onChange}
                placeholder={placeholder}
                rawInput={true}
                secureTextEntry={secureTextEntry}
                testID={`${testID}.input`}
                textContentType={textContentType}
                theme={theme}
                value={value}
            />
            {Boolean(helpText || (disabled && disabledText)) && (
                <Footer
                    disabled={disabled}
                    disabledText={disabledText}
                    helpText={helpText}
                    location={location}
                />
            )}
        </View>
    );
}

export default TextSetting;
