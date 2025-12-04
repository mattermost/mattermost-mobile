// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, TextInput, Platform, type KeyboardTypeOptions} from 'react-native';

import {useTheme} from '@context/theme';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';

import Footer from './footer';
import Label from './label';

import type {AvailableScreens} from '@typings/screens/navigation';

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
    };
});

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
    testID,
    location,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const inputContainerStyle = useMemo(() => (disabled ? [style.inputContainer, style.disabled] : style.inputContainer), [style, disabled]);
    const inputStyle = useMemo(() => (multiline ? style.multiline : style.input), [multiline]);

    const actualKeyboardType: KeyboardTypeOptions = keyboardType === 'url' ? Platform.select({android: 'default', default: 'url'}) : keyboardType;

    return (
        <View testID={testID}>
            {label && (
                <Label
                    label={label}
                    optional={optional}
                    testID={testID}
                />
            )}
            <View style={inputContainerStyle}>
                <View>
                    <TextInput
                        allowFontScaling={true}
                        value={value}
                        placeholder={placeholder}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        onChangeText={onChange}
                        style={inputStyle}
                        autoCapitalize='none'
                        autoCorrect={false}
                        maxLength={maxLength}
                        editable={!disabled}
                        underlineColorAndroid='transparent'
                        disableFullscreenUI={true}
                        multiline={multiline}
                        keyboardType={actualKeyboardType}
                        secureTextEntry={secureTextEntry}
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        testID={`${testID}.input`}
                    />
                </View>
            </View>
            <View>
                <Footer
                    disabled={disabled}
                    disabledText={disabledText}
                    errorText={errorText}
                    helpText={helpText}
                    location={location}
                />
            </View>
        </View>
    );
}

export default TextSetting;
