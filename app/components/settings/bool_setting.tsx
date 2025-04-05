// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, Text, Switch} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Footer from './footer';
import Label from './label';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    label?: string;
    value?: boolean;
    placeholder?: string;
    helpText?: string;
    errorText?: string;
    disabledText?: string;
    optional?: boolean;
    disabled?: boolean;
    onChange: (value: boolean) => void;
    testID: string;
    location: AvailableScreens;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        inputContainer: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            height: 40,
        },
        disabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        placeholderText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 15,
        },
        inputSwitch: {
            position: 'absolute',
            right: 12,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
    };
});

function BoolSetting({
    label,
    value,
    placeholder,
    helpText,
    errorText,
    disabledText,
    optional = false,
    disabled = false,
    onChange,
    testID,
    location,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const inputContainerStyle = useMemo(() => (disabled ? [style.inputContainer, style.disabled] : style.inputContainer), [style, disabled]);

    return (
        <>
            {label && (
                <>
                    <Label
                        label={label}
                        optional={optional}
                        testID={testID}
                    />
                    <View style={style.separator}/>
                </>
            )}
            <View style={[inputContainerStyle]}>
                <Text style={style.placeholderText}>
                    {placeholder}
                </Text>
                <Switch
                    onValueChange={onChange}
                    value={value}
                    style={style.inputSwitch}
                    disabled={disabled}
                />
            </View>
            <View style={style.separator}/>
            <View>
                <Footer
                    disabled={disabled}
                    disabledText={disabledText}
                    errorText={errorText}
                    helpText={helpText}
                    location={location}
                />
            </View>
        </>
    );
}

export default BoolSetting;
