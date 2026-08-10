// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Switch, Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Footer from './footer';

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
        container: {
            backgroundColor: theme.centerChannelBg,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            minHeight: 48,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        disabled: {
            opacity: 0.6,
        },
        labelContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        titleRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 200),
            marginLeft: 5,
        },
        asterisk: {
            color: theme.errorTextColor,
            ...typography('Body', 200),
        },
        description: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
            marginTop: 2,
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
    const checked = value === true;

    // Prefer label as the row title; fall back to placeholder for legacy dialogs that only set placeholder.
    const title = label?.trim() || placeholder?.trim() || '';
    const description = label?.trim() ? (helpText || placeholder) : helpText;

    const trackColor = Platform.select({
        ios: {true: theme.buttonBg, false: changeOpacity(theme.centerChannelColor, 0.16)},
        default: {true: changeOpacity(theme.buttonBg, 0.32), false: changeOpacity(theme.centerChannelColor, 0.24)},
    });
    const thumbColor = Platform.select({
        android: checked ? theme.buttonBg : '#F3F3F3',
    });

    return (
        <View style={style.container}>
            <View style={[style.row, disabled && style.disabled]}>
                <View style={style.labelContainer}>
                    {Boolean(title) && (
                        <View style={style.titleRow}>
                            <Text
                                style={style.label}
                                testID={`${testID}.label`}
                            >
                                {title}
                            </Text>
                            {!optional && (
                                <Text style={style.asterisk}>{' *'}</Text>
                            )}
                            {optional && (
                                <FormattedText
                                    style={style.optional}
                                    id='channel_modal.optional'
                                    defaultMessage='(optional)'
                                />
                            )}
                        </View>
                    )}
                    {Boolean(description) && (
                        <Text
                            style={style.description}
                            testID={`${testID}.description`}
                        >
                            {description}
                        </Text>
                    )}
                </View>
                <Switch
                    disabled={disabled}
                    onValueChange={onChange}
                    value={checked}
                    trackColor={trackColor}
                    thumbColor={thumbColor}
                    testID={`${testID}.toggled.${checked}.button`}
                />
            </View>
            <Footer
                disabled={disabled}
                disabledText={disabledText}
                errorText={errorText}
                location={location}
            />
        </View>
    );
}

export default BoolSetting;
